#!/usr/bin/env python3
"""
Test script to verify the save recologics endpoint is registered
"""
import sys
import os
sys.path.insert(0, 'python')

try:
    from app.main import app
    from fastapi.routing import APIRoute
    
    print("=== Checking registered routes ===")
    routes = []
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            if 'recologics' in route.path or 'save' in route.path:
                routes.append({
                    'path': route.path,
                    'methods': list(route.methods) if route.methods else []
                })
    
    print(f"Found {len(routes)} recologics/save related routes:")
    for route in routes:
        print(f"  {route['methods']} {route['path']}")
    
    # Check specifically for save
    save_routes = [r for r in routes if 'save' in r['path'] and 'recologics' in r['path']]
    if save_routes:
        print(f"\n✅ Save endpoint found: {save_routes[0]}")
    else:
        print("\n❌ Save endpoint NOT FOUND in registered routes!")
        print("\nAll routes with 'api' in path:")
        all_routes = [{'path': r.path, 'methods': list(r.methods) if hasattr(r, 'methods') and r.methods else []} 
                     for r in app.routes if hasattr(r, 'path') and 'api' in r.path]
        for r in all_routes[:20]:  # Show first 20
            print(f"  {r['methods']} {r['path']}")
            
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

