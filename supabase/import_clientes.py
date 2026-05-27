"""
FSVOICE – Car One
Script de importación de clientes desde CSV a Supabase

Uso:
  1. pip install supabase pandas
  2. Completar SUPABASE_URL y SUPABASE_KEY abajo
  3. Preparar el CSV con las columnas indicadas
  4. python import_clientes.py --file clientes.csv

Columnas esperadas en el CSV (separador: coma o punto y coma):
  nombre, apellido, dni, email, email_alternativo,
  telefono, telefono_alternativo, direccion, ciudad, provincia,
  concesionaria, marca, modelo, version, anio, patente, fecha_compra

fecha_compra formato: YYYY-MM-DD o DD/MM/YYYY
"""

import argparse
import pandas as pd
from supabase import create_client

SUPABASE_URL = "TU_SUPABASE_URL_AQUI"
SUPABASE_KEY = "TU_SUPABASE_ANON_KEY_AQUI"

COLUMNAS = [
    'nombre', 'apellido', 'dni', 'email', 'email_alternativo',
    'telefono', 'telefono_alternativo', 'direccion', 'ciudad', 'provincia',
    'concesionaria', 'marca', 'modelo', 'version', 'anio', 'patente', 'fecha_compra'
]

def parsear_fecha(val):
    if pd.isna(val) or str(val).strip() == '':
        return None
    val = str(val).strip()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
        try:
            from datetime import datetime
            return datetime.strptime(val, fmt).strftime('%Y-%m-%d')
        except ValueError:
            continue
    return None

def importar(filepath: str):
    sep = ';' if filepath.endswith('.csv') and open(filepath).read(200).count(';') > open(filepath).read(200).count(',') else ','
    df = pd.read_csv(filepath, sep=sep, dtype=str)
    df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')

    print(f"📄 {len(df)} filas encontradas en {filepath}")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    ok = 0
    errores = []

    for i, row in df.iterrows():
        registro = {}
        for col in COLUMNAS:
            val = row.get(col, None)
            if pd.isna(val) if hasattr(val, '__class__') and val.__class__.__name__ == 'float' else val == '' or val == 'nan':
                registro[col] = None
            else:
                registro[col] = str(val).strip() if val else None

        if col == 'fecha_compra':
            registro['fecha_compra'] = parsear_fecha(row.get('fecha_compra'))

        if registro.get('anio'):
            try:
                registro['anio'] = int(registro['anio'])
            except:
                registro['anio'] = None

        if not registro.get('nombre') or not registro.get('apellido'):
            errores.append(f"Fila {i+2}: nombre o apellido vacío, saltada")
            continue

        try:
            supabase.table('clientes').insert(registro).execute()
            ok += 1
        except Exception as e:
            errores.append(f"Fila {i+2}: {e}")

    print(f"\n✅ {ok} clientes importados correctamente")
    if errores:
        print(f"⚠️  {len(errores)} errores:")
        for e in errores:
            print(f"   {e}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Importar clientes CSV a FSVOICE')
    parser.add_argument('--file', required=True, help='Ruta al archivo CSV')
    args = parser.parse_args()
    importar(args.file)
