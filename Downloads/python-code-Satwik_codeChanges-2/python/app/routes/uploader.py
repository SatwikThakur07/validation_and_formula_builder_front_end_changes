"""
File uploader routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.config.database import get_sso_db, get_main_db
from app.middleware.auth import get_current_user
from app.models.main.upload_record import UploadRecord
from app.models.sso.user_details import UserDetails
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import uuid
import logging
from datetime import datetime
import httpx
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)

# FeynmanFlow API configuration - configurable via environment variable
FEYNMANFLOW_API_BASE_URL = os.getenv("FEYNMANFLOW_API_URL", "http://0.0.0.0:8000")
FEYNMANFLOW_UPLOAD_ENDPOINT = "/upload/vector-match-excel"
DEFAULT_CHUNK_SIZE = 1000

# Valid upload types
VALID_TYPES = [
    "orders",
    "transactions", 
    "reconciliation",
    "trm",
    "mpr_hdfc_card",
    "mpr_hdfc_upi",
    "pizzahut_orders"
]

# Allowed file extensions
ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv", ".tsv"]

# Maximum file size (400MB)
MAX_FILE_SIZE = 400 * 1024 * 1024


class UploadResponse(BaseModel):
    id: int
    filename: str
    status: str
    message: str


class UploadStatusResponse(BaseModel):
    id: int
    filename: str
    status: str
    message: str
    filepath: Optional[str] = None
    filesize: Optional[int] = None
    filetype: Optional[str] = None
    upload_type: Optional[str] = None
    processed_data: Optional[str] = None


@router.post("/upload")
async def upload_files(
    request: Request,
    background_tasks: BackgroundTasks,
    type: Optional[str] = Form(None),
    files: List[UploadFile] = File(...),
    datasource: Optional[str] = Query(None),
    client: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_sso_db),
    current_user: UserDetails = Depends(get_current_user)
):
    """
    Upload multiple files
    
    If datasource query parameter is provided, proxies request to FeynmanFlow-finance-0.1 API.
    Otherwise, uses the original Node.js upload logic with type parameter.
    
    For datasource uploads: Accepts files, returns 200 immediately, processes in background.
    """
    try:
        # Check if datasource is provided in query parameters (for FeynmanFlow API proxy)
        if datasource:
            logger.info(f"Proxying upload request to FeynmanFlow API with datasource: {datasource}, client: {client}")
            return await proxy_to_feynmanflow_api_async(request, files, datasource, client, background_tasks)
        
        # Otherwise, use the original upload logic
        if not type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'type' (form data) or 'datasource' (query parameter) is required"
            )
        
        # Validate upload type
        if type not in VALID_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid type. Must be one of: {', '.join(VALID_TYPES)}"
            )
        
        if not files:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No files uploaded"
            )
        
        uploaded_files = []
        processing_jobs = []
        
        # Create uploads directory if it doesn't exist
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Process each uploaded file
        for file in files:
            try:
                # Validate file
                if not file.filename:
                    continue
                
                # Check file extension
                file_ext = os.path.splitext(file.filename)[1].lower()
                if file_ext not in ALLOWED_EXTENSIONS:
                    uploaded_files.append({
                        "filename": file.filename,
                        "status": "error",
                        "message": f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
                    })
                    continue
                
                # Check file size
                file_content = await file.read()
                if len(file_content) > MAX_FILE_SIZE:
                    uploaded_files.append({
                        "filename": file.filename,
                        "status": "error",
                        "message": f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
                    })
                    continue
                
                # Generate unique filename
                unique_filename = f"{uuid.uuid4()}_{file.filename}"
                file_path = os.path.join(upload_dir, unique_filename)
                
                # Save file
                with open(file_path, "wb") as f:
                    f.write(file_content)
                
                # Create upload record in database
                upload_record = await UploadRecord.create(db,
                    filename=file.filename,
                    filepath=file_path,
                    filesize=len(file_content),
                    filetype=file_ext,
                    upload_type=type,
                    status="uploaded",
                    message="File uploaded successfully, processing in background"
                )
                
                uploaded_files.append({
                    "id": upload_record.id,
                    "filename": file.filename,
                    "status": "uploaded",
                    "message": "File uploaded successfully"
                })
                
                # Schedule background processing
                background_tasks.add_task(process_upload_background, upload_record.id, file_path, type)
                
            except Exception as e:
                logger.error(f"Error processing file {file.filename}: {e}")
                uploaded_files.append({
                    "filename": file.filename,
                    "status": "error",
                    "message": f"Error processing file: {str(e)}"
                })
        
        return {
            "status": 200,
            "message": "Files uploaded successfully",
            "data": {
                "uploadedFiles": uploaded_files
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading files: {str(e)}"
        )


async def proxy_to_feynmanflow_api_async(
    request: Request,
    files: List[UploadFile],
    datasource: str,
    client: Optional[str],
    background_tasks: BackgroundTasks
):
    """Proxy upload request to FeynmanFlow API"""
    try:
        # Read file contents
        file_contents = []
        for file in files:
            content = await file.read()
            file_contents.append((file.filename, content, file.content_type))
        
        # Create FormData for FeynmanFlow API
        async with httpx.AsyncClient(timeout=300.0) as client_http:
            files_data = []
            for filename, content, content_type in file_contents:
                files_data.append(("files", (filename, content, content_type)))
            
            params = {"datasource": datasource}
            if client:
                params["client"] = client
            
            response = await client_http.post(
                f"{FEYNMANFLOW_API_BASE_URL}{FEYNMANFLOW_UPLOAD_ENDPOINT}",
                files=files_data,
                params=params
            )
            
            if response.status_code not in [200, 201]:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"FeynmanFlow API error: {response.text}"
                )
            
            result = response.json()
            
            # Extract upload IDs from response
            uploaded_files = []
            if isinstance(result, dict):
                if "uploadedFiles" in result:
                    uploaded_files = result["uploadedFiles"]
                elif "data" in result and "uploadedFiles" in result["data"]:
                    uploaded_files = result["data"]["uploadedFiles"]
                elif "files" in result:
                    uploaded_files = result["files"]
            
            # If no uploadedFiles in response, create from file list
            if not uploaded_files:
                uploaded_files = [
                    {
                        "id": i + 1,
                        "filename": filename,
                        "status": "uploaded",
                        "message": "File uploaded successfully"
                    }
                    for i, (filename, _, _) in enumerate(file_contents)
                ]
            
            return {
                "status": 200,
                "message": "Files uploaded successfully",
                "data": {
                    "uploadedFiles": uploaded_files
                }
            }
            
    except httpx.ConnectError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="FeynmanFlow API is not available. Please ensure FeynmanFlow service is running on port 8000."
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="FeynmanFlow API request timed out. Please try again."
        )
    except Exception as e:
        logger.error(f"FeynmanFlow proxy error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error proxying to FeynmanFlow API: {str(e)}"
        )


async def process_upload_background(upload_id: int, file_path: str, upload_type: str):
    """Background task to process uploaded file"""
    # Implement background processing logic here
    logger.info(f"Processing upload {upload_id} in background")


@router.get("/status/{upload_id}")
async def get_upload_status(
    upload_id: int,
    db: AsyncSession = Depends(get_sso_db),
    current_user: UserDetails = Depends(get_current_user)
):
    """Get upload status by ID"""
    try:
        upload_record = await UploadRecord.get_by_id(db, upload_id)
        
        if not upload_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found"
            )
        
        return {
            "id": upload_record.id,
            "filename": upload_record.filename,
            "status": upload_record.status,
            "message": upload_record.message,
            "filepath": upload_record.filepath,
            "filesize": upload_record.filesize,
            "filetype": upload_record.filetype,
            "upload_type": upload_record.upload_type,
            "processed_data": upload_record.processed_data,
            "created_at": upload_record.created_at.isoformat() if upload_record.created_at else None,
            "updated_at": upload_record.updated_at.isoformat() if upload_record.updated_at else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get upload status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/uploads")
async def get_all_uploads(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_sso_db),
    current_user: UserDetails = Depends(get_current_user)
):
    """Get all uploads with pagination"""
    try:
        uploads, total_count = await UploadRecord.get_all_with_pagination(
            db, page, limit, status, type
        )
        
        # Format response
        upload_list = []
        for upload in uploads:
            upload_list.append({
                "id": upload.id,
                "filename": upload.filename,
                "filepath": upload.filepath,
                "filesize": upload.filesize,
                "filetype": upload.filetype,
                "upload_type": upload.upload_type,
                "status": upload.status,
                "message": upload.message,
                "processed_data": upload.processed_data,
                "created_at": upload.created_at.isoformat() if upload.created_at else None,
                "updated_at": upload.updated_at.isoformat() if upload.updated_at else None
            })
        
        return {
            "success": True,
            "data": {
                "uploads": upload_list,
                "pagination": {
                    "currentPage": page,
                    "totalPages": (total_count + limit - 1) // limit,
                    "totalItems": total_count,
                    "itemsPerPage": limit
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Get all uploads error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.delete("/uploads/{upload_id}")
async def delete_upload(
    upload_id: int,
    db: AsyncSession = Depends(get_sso_db),
    current_user: UserDetails = Depends(get_current_user)
):
    """Delete an upload record"""
    try:
        upload_record = await UploadRecord.get_by_id(db, upload_id)
        
        if not upload_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found"
            )
        
        # Delete file if exists
        if upload_record.filepath and os.path.exists(upload_record.filepath):
            try:
                os.remove(upload_record.filepath)
            except Exception as e:
                logger.warning(f"Could not delete file {upload_record.filepath}: {e}")
        
        # Delete database record
        await UploadRecord.delete(db, upload_id)
        
        return {
            "status": 200,
            "message": "Upload deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/analyze-columns")
async def analyze_columns(
    file: UploadFile = File(...),
    datasource: str = Query(..., description="Data source identifier"),
    current_user: UserDetails = Depends(get_current_user)
):
    """
    Analyze Excel file columns and return mappings to system-understood columns.
    Proxies to FeynmanFlow API for vector-based column matching.
    """
    try:
        logger.info(f"[ANALYZE-COLUMNS] Analyzing columns for file: {file.filename}, datasource: {datasource}")
        
        # Validate file
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No file provided"
            )
        
        # Check file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        file_content = await file.read()
        
        # For analyze-columns, we only need headers, so allow larger files
        # Set a higher limit for analysis (1GB) since we only read headers
        ANALYSIS_MAX_FILE_SIZE = 1024 * 1024 * 1024  # 1GB for analysis
        
        if len(file_content) > ANALYSIS_MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large for analysis. Maximum size: {ANALYSIS_MAX_FILE_SIZE / (1024*1024*1024)}GB"
            )
        

        analyze_url = f"{FEYNMANFLOW_API_BASE_URL}/analyze-columns"
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            # Create FormData for multipart upload
            from io import BytesIO
            file_stream = BytesIO(file_content)
            files_data = {
                "file": (file.filename, file_stream, file.content_type or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            }
            params = {"datasource": datasource, "save_mappings": "false"}
            
            response = await client.post(analyze_url, files=files_data, params=params)
            
            if response.status_code != 200:
                logger.error(f"[ANALYZE-COLUMNS] FeynmanFlow API error: {response.text}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error analyzing columns: {response.text}"
                )
            
            result = response.json()
            
            logger.info(f"[ANALYZE-COLUMNS] Successfully analyzed columns")
            return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[ANALYZE-COLUMNS] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing columns: {str(e)}"
        )


@router.post("/validate-columns")
async def validate_columns(
    upload_id: Optional[str] = Form(None),  # Accept as string first, convert to int
    file: Optional[UploadFile] = File(None),
    datasource: str = Form(...),
    client: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_sso_db),
    current_user: UserDetails = Depends(get_current_user)
):
    """
    Get column mappings for validation.
    Can use either upload_id (for already uploaded file) or file (for new file).
    Returns DB columns on left and Excel columns for selection.
    """
    try:
        file_to_analyze = None
        filename = None
        
        # Convert upload_id to int if provided
        upload_id_int = None
        if upload_id:
            try:
                upload_id_int = int(upload_id)
            except (ValueError, TypeError):
                logger.warning(f"Invalid upload_id format: {upload_id}")
                upload_id_int = None
        
        # If upload_id provided, get file from upload record
        if upload_id_int:
            try:
                upload_record = await UploadRecord.get_by_id(db, upload_id_int)
                if upload_record and upload_record.filepath and os.path.exists(upload_record.filepath):
                    with open(upload_record.filepath, "rb") as f:
                        file_to_analyze = f.read()
                    filename = upload_record.filename
                    logger.info(f"[VALIDATE-COLUMNS] Using file from upload record {upload_id_int}: {filename}")
                else:
                    logger.warning(f"[VALIDATE-COLUMNS] Upload record {upload_id_int} not found or file missing")
            except Exception as e:
                logger.error(f"[VALIDATE-COLUMNS] Error reading upload record {upload_id_int}: {e}")
        
        # If file provided directly, use it
        if not file_to_analyze and file:
            file_to_analyze = await file.read()
            filename = file.filename
            logger.info(f"[VALIDATE-COLUMNS] Using directly uploaded file: {filename}")
        
        if not file_to_analyze:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either upload_id or file must be provided"
            )
        
        # Analyze columns using FeynmanFlow API
        analyze_url = f"{FEYNMANFLOW_API_BASE_URL}/analyze-columns"
        
        async with httpx.AsyncClient(timeout=60.0) as http_client:
            from io import BytesIO
            file_stream = BytesIO(file_to_analyze)
            files_data = {
                "file": (filename, file_stream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            }
            params = {
                "datasource": datasource,
                "save_mappings": "false"
            }
            if client:
                params["client"] = client
            
            try:
                response = await http_client.post(analyze_url, files=files_data, params=params)
            except httpx.ConnectError:
                logger.error(f"[VALIDATE-COLUMNS] Cannot connect to FeynmanFlow API at {analyze_url}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="FeynmanFlow API is not available. Please ensure FeynmanFlow service is running on port 8000."
                )
            except httpx.TimeoutException:
                logger.error(f"[VALIDATE-COLUMNS] Timeout connecting to FeynmanFlow API")
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="FeynmanFlow API request timed out. Please try again."
                )
            except Exception as feynman_error:
                logger.error(f"[VALIDATE-COLUMNS] Error connecting to FeynmanFlow API: {str(feynman_error)}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Cannot connect to FeynmanFlow API: {str(feynman_error)}"
                )
            
            if response.status_code != 200:
                error_detail = response.text
                logger.error(f"[VALIDATE-COLUMNS] FeynmanFlow API returned {response.status_code}: {error_detail}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"FeynmanFlow API error: {error_detail}"
                )
            
            result = response.json()
            
            # Format response for frontend
            # FeynmanFlow returns: {db_columns: [...], excel_columns: [...], mappings: {...}}
            # Frontend expects: {validation_data: {db_columns: [...], excel_columns: [...], mappings: {...}}}
            formatted_result = {
                "status": 200,
                "message": "Columns validated successfully",
                "data": {
                    "validation_data": result
                }
            }
            
            logger.info(f"[VALIDATE-COLUMNS] Successfully validated columns for datasource: {datasource}")
            return formatted_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[VALIDATE-COLUMNS] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error validating columns: {str(e)}"
        )


class SaveMappingsRequest(BaseModel):
    upload_id: Optional[int] = None
    datasource: str
    client: Optional[str] = None
    mappings: Dict[str, str]  # {db_column: excel_column}


@router.post("/save-column-mappings")
async def save_column_mappings(
    mappings_data: SaveMappingsRequest,
    db: AsyncSession = Depends(get_sso_db),
    current_user: UserDetails = Depends(get_current_user)
):
    """
    Save/update column mappings after validation.
    mappings_data should contain:
    - upload_id (optional)
    - datasource (required)
    - client (optional)
    - mappings: {db_column: excel_column}
    """
    try:
        upload_id = mappings_data.upload_id
        datasource = mappings_data.datasource
        client = mappings_data.client
        mappings = mappings_data.mappings
        
        if not datasource:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="datasource is required"
            )
        
        if not mappings:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="mappings are required"
            )
        
        # Save mappings to FeynmanFlow API or database
        # For now, we'll proxy to FeynmanFlow API to save mappings
        save_url = f"{FEYNMANFLOW_API_BASE_URL}/save-column-mappings"
        feynmanflow_success = False
        
        # Retry logic for FeynmanFlow API calls
        max_retries = 3
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=60.0) as http_client:
                    payload = {
                        "datasource": datasource,
                        "mappings": mappings
                    }
                    if client:
                        payload["client"] = client
                    if upload_id:
                        payload["upload_id"] = upload_id
                    
                    response = await http_client.post(save_url, json=payload)
                    
                    if response.status_code in [200, 201]:
                        feynmanflow_success = True
                        logger.info(f"[SAVE-MAPPINGS] Successfully saved mappings to FeynmanFlow API")
                        break
                    elif attempt < max_retries - 1:
                        logger.warning(f"[SAVE-MAPPINGS] FeynmanFlow API returned {response.status_code} on attempt {attempt + 1}/{max_retries}. Retrying...")
                        await asyncio.sleep(1.0 * (attempt + 1))
                    else:
                        logger.warning(f"[SAVE-MAPPINGS] FeynmanFlow API returned {response.status_code}: {response.text}")
                        # Don't fail if save endpoint doesn't exist, just log warning
            except httpx.ConnectError:
                if attempt < max_retries - 1:
                    logger.warning(f"[SAVE-MAPPINGS] Connection attempt {attempt + 1}/{max_retries} failed. Retrying...")
                    await asyncio.sleep(1.0 * (attempt + 1))
                else:
                    logger.warning(f"[SAVE-MAPPINGS] Could not connect to FeynmanFlow API at {save_url} after {max_retries} attempts. Mappings will be saved to database only.")
            except httpx.TimeoutException:
                if attempt < max_retries - 1:
                    logger.warning(f"[SAVE-MAPPINGS] Timeout attempt {attempt + 1}/{max_retries}. Retrying...")
                    await asyncio.sleep(1.0 * (attempt + 1))
                else:
                    logger.warning(f"[SAVE-MAPPINGS] Timeout connecting to FeynmanFlow API after {max_retries} attempts. Mappings will be saved to database only.")
            except Exception as feynman_error:
                error_str = str(feynman_error).lower()
                if any(keyword in error_str for keyword in ['network', 'connection', 'timeout']) and attempt < max_retries - 1:
                    logger.warning(f"[SAVE-MAPPINGS] Error attempt {attempt + 1}/{max_retries}: {str(feynman_error)}. Retrying...")
                    await asyncio.sleep(1.0 * (attempt + 1))
                else:
                    logger.warning(f"[SAVE-MAPPINGS] Error calling FeynmanFlow API: {str(feynman_error)}. Mappings will be saved to database only.")
        
        # Always save to database regardless of FeynmanFlow API result
        # This ensures mappings are persisted even if FeynmanFlow is unavailable
        
        # Update upload record if upload_id provided
        if upload_id:
            try:
                upload_record = await UploadRecord.get_by_id(db, upload_id)
                if upload_record:
                    import json
                    await UploadRecord.update(
                        db,
                        upload_id,
                        processed_data=json.dumps(mappings)
                    )
                    logger.info(f"[SAVE-MAPPINGS] Updated upload record {upload_id} with mappings")
                else:
                    logger.warning(f"[SAVE-MAPPINGS] Upload record {upload_id} not found, but mappings saved")
            except Exception as db_error:
                logger.error(f"[SAVE-MAPPINGS] Database error updating upload record {upload_id}: {str(db_error)}", exc_info=True)
                # Don't fail the entire operation if DB update fails - mappings are still saved
        
        # IMPORTANT: Update customised_db_fields table in devyani database
        # This is the main table where mappings are permanently stored
        try:
            from sqlalchemy import text
            
            # Get main database session using async generator
            async for main_db_session in get_main_db():
                try:
                    updated_count = 0
                    for db_column, excel_column in mappings.items():
                        # Update mapping in customised_db_fields table
                        # Match by db_column_name and data_source
                        update_query = text("""
                            UPDATE customised_db_fields
                            SET excel_column_name = :excel_column,
                                updated_date = NOW()
                            WHERE db_column_name = :db_column
                            AND data_source = :datasource
                        """)
                        
                        params = {
                            "excel_column": excel_column,
                            "db_column": db_column,
                            "datasource": datasource
                        }
                        
                        # Add client_name filter if provided
                        if client:
                            update_query = text("""
                                UPDATE customised_db_fields
                                SET excel_column_name = :excel_column,
                                    updated_date = NOW()
                                WHERE db_column_name = :db_column
                                AND data_source = :datasource
                                AND (client_name = :client OR client_name IS NULL)
                            """)
                            params["client"] = client
                        
                        result = await main_db_session.execute(update_query, params)
                        rows_affected = result.rowcount
                        
                        if rows_affected > 0:
                            updated_count += 1
                            logger.info(f"[SAVE-MAPPINGS] ✅ Updated customised_db_fields: {db_column} → {excel_column} (datasource: {datasource})")
                        else:
                            # If no row exists, log warning (row may need to be created first via upload/analysis)
                            logger.warning(f"[SAVE-MAPPINGS] ⚠️  No existing row found for db_column={db_column}, datasource={datasource}. Mapping not updated in customised_db_fields.")
                    
                    await main_db_session.commit()
                    logger.info(f"[SAVE-MAPPINGS] ✅ Updated {updated_count}/{len(mappings)} mappings in customised_db_fields table")
                    break  # Exit the async generator loop after first iteration
                    
                except Exception as main_db_error:
                    await main_db_session.rollback()
                    logger.error(f"[SAVE-MAPPINGS] ❌ Error updating customised_db_fields: {str(main_db_error)}", exc_info=True)
                    # Don't fail the entire operation - mappings are still saved to upload_logs
                    break
                
        except Exception as e:
            logger.error(f"[SAVE-MAPPINGS] ❌ Error accessing main database: {str(e)}", exc_info=True)
            # Don't fail the entire operation - continue
        
        # Return success response in format expected by frontend
        return {
            "status": 200,
            "message": "Column mappings saved successfully",
            "data": {
                "saved_mappings": len(mappings),
                "upload_id": upload_id,
                "success": True
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SAVE-MAPPINGS] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving mappings: {str(e)}"
        )


@router.get("/datasource")
async def get_datasource(
    db: AsyncSession = Depends(get_main_db),
    current_user: UserDetails = Depends(get_current_user)
):
    """
    Get datasource configuration from database
    Queries data_source table and groups data by category, tender, and type.
    
    Flow:
    1. Query data_source table from main database
    2. Group by category -> tender -> type
    3. Return structured response matching production API
    
    Table: data_source
    Columns: id, name (dataSource), category, tender, type
    """
    try:
        logger.info("[DATASOURCE] Controller hit: GET /api/uploader/datasource")
        
        # Query data_source table
        # Table structure: id, name (dataSource), category, tender, type
        query = text("""
            SELECT 
                category,
                tender,
                type,
                name as dataSource
            FROM data_source
            WHERE category IS NOT NULL
            AND tender IS NOT NULL
            AND type IS NOT NULL
            AND name IS NOT NULL
            ORDER BY category, tender, name
        """)
        
        logger.info(f"[DATASOURCE] SQL Query: {query}")
        
        result = await db.execute(query)
        rows = result.fetchall()
        
        logger.info(f"[DATASOURCE] Found {len(rows)} records from data_source table")
        
        # Group by category -> tender -> type
        # Structure: category_map[category][tender][dataSource] = type
        category_map: Dict[str, Dict[str, Dict[str, str]]] = {}
        
        for row in rows:
            category = row[0]
            tender = row[1]
            type_value = row[2]
            data_source = row[3]
            
            # Initialize category if not exists
            if category not in category_map:
                category_map[category] = {}
            
            # Initialize tender if not exists
            if tender not in category_map[category]:
                category_map[category][tender] = {}
            
            # Add dataSource -> type mapping
            category_map[category][tender][data_source] = type_value
        
        # Convert to response format
        result_data = []
        category_order = ["3PO", "Banking", "POS", "Config", "Cash_PickUp"]
        
        for category in category_order:
            if category in category_map and category_map[category]:
                tenders = []
                for tender, data_source_map in sorted(category_map[category].items()):
                    # Convert data_source_map to types list
                    types_list = [
                        {
                            "type": type_value,
                            "dataSource": data_source
                        }
                        for data_source, type_value in sorted(data_source_map.items())
                    ]
                    
                    tenders.append({
                        "tender": tender,
                        "types": types_list
                    })
                
                if tenders:
                    result_data.append({
                        "category": category,
                        "tenders": tenders
                    })
        
        # Add any remaining categories not in the order list
        for category, tenders_dict in category_map.items():
            if category not in category_order:
                tenders = []
                for tender, data_source_map in sorted(tenders_dict.items()):
                    types_list = [
                        {
                            "type": type_value,
                            "dataSource": data_source
                        }
                        for data_source, type_value in sorted(data_source_map.items())
                    ]
                    
                    tenders.append({
                        "tender": tender,
                        "types": types_list
                    })
                
                if tenders:
                    result_data.append({
                        "category": category,
                        "tenders": tenders
                    })
        
        response = {
            "status": 200,
            "message": "DataSources",
            "data": result_data
        }
        
        logger.info(f"[DATASOURCE] Query executed successfully")
        logger.info(f"[DATASOURCE] Response: {len(result_data)} categories, total records: {len(rows)}")
        
        return response
        
    except Exception as e:
        logger.error(f"[DATASOURCE] Error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching datasource: {str(e)}"
        )
