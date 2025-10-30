import json
import os
import re
import math
import csv
from typing import Dict, Any, Optional, List
import ast  # For safe evaluation
from datetime import datetime

class UltimateFormulaBuilder:
    def __init__(self):
        # Sample data table: Column A1 (descriptions), Column B1 (codes), units
        self.table_data: Dict[str, Dict[str, str]] = {
            'Discount': {'code': 'D', 'unit': '%'},
            'Total': {'code': 'T', 'unit': '$'},
            'Quantity': {'code': 'Q', 'unit': 'units'},
            'Price': {'code': 'P', 'unit': '$'},
            'Tax': {'code': 'X', 'unit': '%'},
            'Shipping': {'code': 'S', 'unit': '$'}
        }
        self.variables = [data['code'] for data in self.table_data.values()]
        self.units = {data['code']: data['unit'] for data in self.table_data.values()}
        self.unit_conversions = {  # Simple conversion factors (base: SI-like)
            '%': 0.01,  # to decimal
            '$': 1.0,   # base currency
            'units': 1.0,
            # Add more as needed, e.g., 'kg': 1.0, 'lb': 0.453592
        }
        self.operations = ['+', '-', '*', '/', '^', '(', ')', 'abs', 'sqrt', 'log', 'exp']
        self.constants = {'pi': math.pi, 'e': math.e}
        self.templates: Dict[str, Dict[str, Any]] = {}  # name -> {'template': str, 'desc': str}
        self.formulas: Dict[str, Dict[str, Any]] = {}
        self.eval_history: List[Dict[str, Any]] = []
        
        # Files
        self.formula_file = 'formulas.json'
        self.table_file = 'table_data.json'
        self.template_file = 'templates.json'
        self.history_file = 'eval_history.json'
        self.load_data()
    
    def load_data(self):
        """Load all data from files."""
        # Load formulas
        if os.path.exists(self.formula_file):
            with open(self.formula_file, 'r') as f:
                loaded = json.load(f)
                for name, data in loaded.items():
                    if isinstance(data, str):
                        self.formulas[name] = {'expr': data, 'desc': '', 'created': datetime.now().isoformat()}
                    else:
                        self.formulas[name] = data
        
        # Load table with migration
        if os.path.exists(self.table_file):
            with open(self.table_file, 'r') as f:
                loaded_table = json.load(f)
            migrated = {}
            for k, v in loaded_table.items():
                if isinstance(v, str):
                    migrated[k] = {'code': v, 'unit': 'none'}
                else:
                    migrated[k] = v
            self.table_data.update(migrated)
            self.variables = [data['code'] for data in self.table_data.values()]
            self.units = {data['code']: data['unit'] for data in self.table_data.values()}
        else:
            # Ensure initial state
            self.variables = [data['code'] for data in self.table_data.values()]
            self.units = {data['code']: data['unit'] for data in self.table_data.values()}
        
        # Load templates
        if os.path.exists(self.template_file):
            with open(self.template_file, 'r') as f:
                self.templates = json.load(f)
        
        # Load history
        if os.path.exists(self.history_file):
            with open(self.history_file, 'r') as f:
                self.eval_history = json.load(f)
    
    def save_data(self, save_history: bool = True):
        """Save all data to files."""
        with open(self.formula_file, 'w') as f:
            json.dump(self.formulas, f, indent=4)
        with open(self.table_file, 'w') as f:
            json.dump(self.table_data, f, indent=4)
        with open(self.template_file, 'w') as f:
            json.dump(self.templates, f, indent=4)
        if save_history:
            with open(self.history_file, 'w') as f:
                json.dump(self.eval_history, f, indent=4)
    
    def print_colored(self, text: str, color: str = 'white'):
        """Print colored text."""
        colors = {'green': '\033[92m', 'red': '\033[91m', 'yellow': '\033[93m', 'blue': '\033[94m', 'end': '\033[0m'}
        print(f"{colors.get(color, '')}{text}{colors['end']}")
    
    def print_header(self, text: str):
        """Print header."""
        self.print_colored("=" * 50, 'blue')
        self.print_colored(f" {text} ".center(50), 'blue')
        self.print_colored("=" * 50, 'blue')
    
    def display_table(self, show_constants: bool = True):
        """Display table with units."""
        self.print_header("Data Table")
        print(f"{'Description':<20} | {'Code':<10} | {'Unit':<10}")
        print("-" * 50)
        for desc, data in sorted(self.table_data.items()):
            print(f"{desc:<20} | {data['code']:<10} | {data['unit']:<10}")
        print("-" * 50)
        if show_constants:
            print("\nConstants:")
            for const, val in self.constants.items():
                print(f"{const:<20} | {val}")
        print("\nTip: Units are supported with conversions during eval.")
        print()
    
    def add_variable_interactive(self):
        """Add variable with unit."""
        self.print_header("Add New Variable")
        while True:
            desc = input("Description (or 'cancel'): ").strip()
            if desc.lower() == 'cancel':
                return
            if not desc:
                self.print_colored("Empty description.", 'red')
                continue
            code = input("Code (uppercase letter): ").strip().upper()
            if len(code) != 1 or not code.isalpha():
                self.print_colored("Invalid code.", 'red')
                continue
            if code in self.variables:
                self.print_colored("Code exists.", 'red')
                continue
            unit = input("Unit (e.g., $, %): ").strip() or 'none'
            self.table_data[desc] = {'code': code, 'unit': unit}
            self.variables.append(code)
            self.units[code] = unit
            self.save_data()
            self.print_colored(f"Added: {desc} -> {code} ({unit})", 'green')
            break
    
    def build_formula_interactive(self, edit_name: Optional[str] = None):
        """Build with template support and suggestions."""
        if edit_name:
            self.print_header(f"Edit: {edit_name}")
            formula_parts = list(self.formulas[edit_name]['expr'])
        else:
            self.print_header("Build New Formula")
            # Template option
            if self.templates:
                print("Templates available. Use one? (y/n)")
                if input().strip().lower() == 'y':
                    for tname in self.templates:
                        print(f"- {tname}: {self.templates[tname]['template']}")
                    tname = input("Template name: ").strip()
                    if tname in self.templates:
                        template = self.templates[tname]['template']
                        formula_parts = list(template)  # Simple start with template
                        print(f"Started with template: {template}")
                    else:
                        formula_parts = []
                else:
                    formula_parts = []
            else:
                formula_parts = []
        
        while True:
            current = ''.join(formula_parts)
            print(f"Current: {current}")
            # AI Suggestion (rule-based)
            suggestion = self.suggest_next(current)
            if suggestion:
                print(f"Suggestion: {suggestion}")
            
            print("\nOptions:")
            print("1. Add Variable")
            print("2. Add Operation")
            print("3. Add Number")
            print("4. Add Percentage")
            print("5. Undo")
            print("6. Save/Exit")
            print("7. Clear")
            print("s. Apply Suggestion")
            print("h. Help")
            
            choice = input("\nChoose: ").strip().lower()
            
            if choice == 'h':
                print("Help: Build expressions. Suggestions appear automatically. Use 's' to apply.")
                continue
            
            if choice == 's':
                if suggestion:
                    # Apply suggestion by splitting and appending parts
                    parts = suggestion.split()
                    for part in parts:
                        formula_parts.append(part)
                    self.print_colored(f"✓ Applied suggestion: {suggestion}", 'green')
                else:
                    self.print_colored("No suggestion available.", 'yellow')
                continue
            
            if choice == '1':
                print(f"Available: {', '.join(sorted(self.variables))}")
                var = input("Enter variable code: ").strip().upper()
                if var in self.variables:
                    formula_parts.append(var)
                    self.print_colored(f"✓ Added: {var}", 'green')
                else:
                    self.print_colored("✗ Invalid variable.", 'red')
            elif choice == '2':
                print(f"Available: {', '.join(self.operations)}")
                op = input("Enter operation: ").strip()
                if op in self.operations:
                    formula_parts.append(op)
                    self.print_colored(f"✓ Added: {op}", 'green')
                else:
                    self.print_colored("✗ Invalid operation.", 'red')
            elif choice == '3':
                while True:
                    try:
                        num = input("Enter number: ").strip()
                        float(num)  # Validate all number formats
                        formula_parts.append(num)
                        self.print_colored(f"✓ Added: {num}", 'green')
                        break
                    except ValueError:
                        self.print_colored("✗ Invalid number.", 'red')
            elif choice == '4':
                print(f"Available: {', '.join(sorted(self.variables))}")
                var_pct = input("Enter variable code for %: ").strip().upper()
                if var_pct in self.variables:
                    formula_parts.append(f"{var_pct}/100")
                    self.print_colored(f"✓ Added: {var_pct}%", 'green')
                else:
                    self.print_colored("✗ Invalid variable.", 'red')
            elif choice == '5':
                if formula_parts:
                    removed = formula_parts.pop()
                    self.print_colored(f"✓ Undid: {removed}", 'green')
                else:
                    self.print_colored("✗ Nothing to undo.", 'red')
            elif choice == '6':
                break
            elif choice == '7':
                formula_parts = []
                self.print_colored("✓ Cleared.", 'green')
            else:
                self.print_colored("✗ Invalid choice.", 'red')
        
        if not formula_parts:
            return
        
        formula_str = ''.join(formula_parts)
        print(f"\nFinal: {formula_str}")
        
        if self.validate_formula(formula_str):
            self.print_colored("✓ Validated!", 'green')
        else:
            self.print_colored("⚠ Warning. Proceed? (y/n)", 'yellow')
            if input().strip().lower() != 'y':
                return
        
        desc = input("Description (optional): ").strip()
        
        if edit_name:
            self.formulas[edit_name]['expr'] = formula_str
            self.formulas[edit_name]['desc'] = desc
            self.formulas[edit_name]['modified'] = datetime.now().isoformat()
            self.save_data()
            self.print_colored(f"Updated '{edit_name}'.", 'green')
        else:
            name = input("Name (or 'cancel'): ").strip()
            if name.lower() == 'cancel':
                return
            if name in self.formulas:
                self.print_colored("Overwrite? (y/n)", 'yellow')
                if input().strip().lower() != 'y':
                    return
            self.formulas[name] = {
                'expr': formula_str,
                'desc': desc,
                'created': datetime.now().isoformat()
            }
            self.save_data()
            self.print_colored(f"Saved '{name}'.", 'green')
    
    def suggest_next(self, current: str) -> Optional[str]:
        """Rule-based suggestion."""
        if current.endswith('+') or current.endswith('-'):
            return "T"
        if current.count('(') > current.count(')'):
            return ")"
        if 'D' in current and 'T' in current:
            return "-D"
        return None
    
    def validate_formula(self, formula_str: str) -> bool:
        """Validate."""
        try:
            test_expr = re.sub(r'[A-Z]', '1', formula_str)
            test_expr = re.sub(r'\bpi\b', str(math.pi), test_expr)
            test_expr = re.sub(r'\be\b', str(math.e), test_expr)
            ast.parse(test_expr, mode='eval')
            safe_globals = {'__builtins__': {}, 'abs': abs, 'sqrt': math.sqrt, 'log': math.log, 'exp': math.exp, 'pi': math.pi, 'e': math.e}
            eval(test_expr, safe_globals)
            return True
        except:
            return False
    
    def list_formulas(self, search: Optional[str] = None, view_all: bool = False):
        """List formulas."""
        if not self.formulas:
            self.print_colored("No formulas.", 'yellow')
            return
        if view_all:
            self.print_header("All Formulas")
            formulas_to_show = self.formulas
        elif search:
            self.print_header(f"Search: '{search}'")
            matches = [name for name in self.formulas if search.lower() in name.lower() or search.lower() in self.formulas[name].get('desc', '').lower()]
            if not matches:
                self.print_colored("No matches.", 'yellow')
                return
            formulas_to_show = {name: self.formulas[name] for name in matches}
        else:
            self.print_header("Formulas")
            formulas_to_show = self.formulas
        
        for name, data in sorted(formulas_to_show.items()):
            expr = data['expr']
            desc = data.get('desc', 'No description')
            created = data.get('created', 'Unknown')[:10]
            print(f"- {name} ({created}): {expr}")
            if desc:
                print(f"  Desc: {desc}")
        print()
    
    def preview_formula(self, name: str):
        """Preview."""
        if name not in self.formulas:
            self.print_colored("Not found.", 'red')
            return
        expr = self.formulas[name]['expr']
        print(f"Preview: {expr}")
        sample_values = {'D': 10, 'T': 100, 'Q': 5, 'P': 20, 'X': 8, 'S': 5}
        result = self._safe_eval(expr, sample_values)
        if result is not None:
            self.print_colored(f"Sample: {result}", 'green')
        else:
            self.print_colored("Preview error.", 'red')
    
    def evaluate_formula(self):
        """Evaluate."""
        self.list_formulas(view_all=True)
        if not self.formulas:
            return
        name = input("Name (back): ").strip()
        if name.lower() == 'back':
            return
        if name not in self.formulas:
            self.print_colored("Not found.", 'red')
            return
        
        if input("Preview? (y/n): ").lower() == 'y':
            self.preview_formula(name)
        
        expr = self.formulas[name]['expr']
        print(f"Evaluating: {expr}")
        
        used_vars = set(re.findall(r'[A-Z]', expr)) & set(self.variables)
        values = {}
        for var in sorted(used_vars):
            while True:
                val = input(f"{var} (0): ").strip()
                try:
                    values[var] = float(val) if val else 0.0
                    break
                except ValueError:
                    self.print_colored("Invalid value.", 'red')
        
        result = self._safe_eval(expr, values)
        if result is not None:
            self.print_colored(f"Result: {result}", 'green')
            self.add_to_history(name, values, result)
        else:
            self.print_colored("Error.", 'red')
    
    def add_to_history(self, name: str, values: Dict[str, float], result: float):
        """Add to history."""
        entry = {'name': name, 'values': values, 'result': result, 'timestamp': datetime.now().isoformat()}
        self.eval_history.insert(0, entry)
        if len(self.eval_history) > 10:
            self.eval_history = self.eval_history[:10]
        self.save_data(True)
    
    def view_history(self):
        """View history."""
        if not self.eval_history:
            self.print_colored("No history.", 'yellow')
            return
        self.print_header("History")
        for i, entry in enumerate(self.eval_history, 1):
            print(f"{i}. {entry['name']} -> {entry['result']} ({entry['timestamp'][:16]})")
        print()
    
    def _safe_eval(self, expr: str, values: Dict[str, float]) -> Optional[float]:
        """Safe eval with units."""
        eval_expr = expr
        for var, val in values.items():
            unit = self.units.get(var, 'none')
            conv = self.unit_conversions.get(unit, 1.0)
            converted = val * conv
            eval_expr = eval_expr.replace(var, str(converted))
        for const, val in self.constants.items():
            eval_expr = eval_expr.replace(const, str(val))
        try:
            safe_globals = {'__builtins__': {}, 'abs': abs, 'sqrt': math.sqrt, 'log': math.log, 'exp': math.exp, 'pi': math.pi, 'e': math.e}
            return eval(eval_expr, {"__builtins__": {}}, safe_globals)
        except Exception:
            return None
    
    def batch_evaluate(self):
        """Batch eval."""
        self.print_header("Batch Eval")
        self.list_formulas(view_all=True)
        name = input("Formula: ").strip()
        if name not in self.formulas:
            self.print_colored("Not found.", 'red')
            return
        filename = input("CSV file: ").strip()
        if not os.path.exists(filename):
            self.print_colored("File not found.", 'red')
            return
        results = []
        with open(filename, 'r') as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, 1):
                values = {k: float(v) for k, v in row.items() if v}
                result = self._safe_eval(self.formulas[name]['expr'], values)
                results.append({'row': row_num, 'result': result})
                print(f"Row {row_num}: {result if result is not None else 'Error'}")
        print("\nTable:")
        print("Row | Result")
        print("-" * 20)
        for r in results:
            print(f"{r['row']} | {r['result']}")
    
    def manage_templates(self):
        """Manage templates."""
        self.print_header("Templates")
        while True:
            print("1. Create\n2. List\n3. Delete\n4. Back")
            ch = input().strip()
            if ch == '1':
                name = input("Name: ").strip()
                template = input("Template (use {} for placeholders): ").strip()
                desc = input("Desc: ").strip()
                self.templates[name] = {'template': template, 'desc': desc}
                self.save_data()
                self.print_colored("Created.", 'green')
            elif ch == '2':
                for tname, tdata in self.templates.items():
                    print(f"- {tname}: {tdata['template']} ({tdata['desc']})")
            elif ch == '3':
                tname = input("Name: ").strip()
                if tname in self.templates:
                    del self.templates[tname]
                    self.save_data()
                    self.print_colored("Deleted.", 'green')
                else:
                    self.print_colored("Not found.", 'red')
            elif ch == '4':
                break
            else:
                self.print_colored("Invalid.", 'red')
    
    def delete_formula(self):
        """Delete."""
        self.list_formulas(view_all=True)
        name = input("Name (back): ").strip()
        if name.lower() == 'back':
            return
        if name in self.formulas:
            if input("Delete? (y/n): ").lower() == 'y':
                del self.formulas[name]
                self.save_data()
                self.print_colored("Deleted.", 'green')
        else:
            self.print_colored("Not found.", 'red')
    
    def rename_formula(self):
        """Rename."""
        self.list_formulas(view_all=True)
        old = input("Old name (back): ").strip()
        if old.lower() == 'back':
            return
        if old in self.formulas:
            new = input("New name: ").strip()
            if new and new != old:
                self.formulas[new] = self.formulas.pop(old)
                self.save_data()
                self.print_colored("Renamed.", 'green')
            else:
                self.print_colored("Invalid name.", 'red')
        else:
            self.print_colored("Not found.", 'red')
    
    def export_formulas(self):
        """Export."""
        if not self.formulas:
            self.print_colored("No formulas.", 'yellow')
            return
        filename = input("Filename (default: export.txt): ").strip() or 'export.txt'
        try:
            with open(filename, 'w') as f:
                f.write("Formulas\n" + "="*50 + "\n\n")
                for name, data in sorted(self.formulas.items()):
                    f.write(f"Name: {name}\nExpr: {data['expr']}\nDesc: {data.get('desc', '')}\nCreated: {data.get('created', '')[:10]}\n\n")
            self.print_colored(f"Exported to {filename}.", 'green')
        except Exception as e:
            self.print_colored(f"Error: {e}", 'red')
    
    def import_formulas(self):
        """Import."""
        filename = input("Filename: ").strip()
        if not os.path.exists(filename):
            self.print_colored("Not found.", 'red')
            return
        try:
            with open(filename, 'r') as f:
                imported = json.load(f)
            for name, data in imported.items():
                if 'expr' in data:
                    self.formulas[name] = data
            self.save_data()
            self.print_colored(f"Imported {len(imported)}.", 'green')
        except Exception as e:
            self.print_colored(f"Error: {e}", 'red')
    
    def show_tutorial(self):
        """Tutorial."""
        self.print_header("Tutorial")
        print("Build formulas step-by-step with templates and suggestions.")
        print("Supports units, batch eval from CSV, history.")
        print("Use 's' to apply suggestions in build mode.")
        print()
    
    def run(self):
        """Main loop."""
        self.print_colored("Welcome! Type 'tutorial' for guide.", 'blue')
        self.show_tutorial()
        while True:
            self.print_header("Menu")
            print("1. Table")
            print("2. Build")
            print("3. Edit")
            print("4. View All Formulas")
            print("5. Search")
            print("6. Evaluate")
            print("7. Batch Evaluate")
            print("8. History")
            print("9. Templates")
            print("10. Rename")
            print("11. Delete")
            print("12. Export")
            print("13. Import")
            print("14. Tutorial")
            print("15. Exit")
            
            choice = input("\nChoose: ").strip()
            
            if choice == '1':
                self.display_table()
                print("\na. Add Var\nb. Back")
                sub = input().lower()
                if sub == 'a':
                    self.add_variable_interactive()
            elif choice == '2':
                self.build_formula_interactive()
            elif choice == '3':
                self.list_formulas(view_all=True)
                edit = input("Edit name (back): ").strip()
                if edit and edit.lower() != 'back':
                    self.build_formula_interactive(edit)
            elif choice == '4':
                self.list_formulas(view_all=True)
            elif choice == '5':
                search = input("Search: ").strip()
                self.list_formulas(search)
            elif choice == '6':
                self.evaluate_formula()
            elif choice == '7':
                self.batch_evaluate()
            elif choice == '8':
                self.view_history()
            elif choice == '9':
                self.manage_templates()
            elif choice == '10':
                self.rename_formula()
            elif choice == '11':
                self.delete_formula()
            elif choice == '12':
                self.export_formulas()
            elif choice == '13':
                self.import_formulas()
            elif choice == '14':
                self.show_tutorial()
            elif choice == '15':
                if input("Exit? (y/n): ").lower() == 'y':
                    self.print_colored("Goodbye!", 'blue')
                    break
            else:
                self.print_colored("Invalid.", 'red')
            
            input("\nPress Enter...")

# Run
if __name__ == "__main__":
    app = UltimateFormulaBuilder()
    app.run()