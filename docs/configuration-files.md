# Archivos de Configuración

Para inventariar múltiples cuentas automáticamente, puedes usar archivos de configuración JSON o CSV.

**Requisito**: Debes usar `--use-letme` con archivos de configuración.

## Formato JSON

### Estructura

```json
{
  "accounts": [
    {
      "name": "account1",
      "region": "us-east-1"
    },
    {
      "name": "account2",
      "region": "eu-west-1"
    }
  ]
}
```

### Uso

```bash
./generate-aws-inventory --use-letme --json accounts.json
```

### Ejemplo Completo

**Archivo**: `production-accounts.json`

```json
{
  "accounts": [
    {
      "name": "prod-us",
      "region": "us-east-1"
    },
    {
      "name": "prod-eu",
      "region": "eu-west-1"
    },
    {
      "name": "prod-asia",
      "region": "ap-southeast-1"
    }
  ]
}
```

**Comando**:

```bash
./generate-aws-inventory --use-letme --json production-accounts.json --init-security
```

## Formato CSV

### Estructura

```csv
account,region
account1,us-east-1
account2,eu-west-1
```

**Nota**: La primera línea debe ser el encabezado `account,region`.

### Uso

```bash
./generate-aws-inventory --use-letme --csv accounts.csv
```

### Ejemplo Completo

**Archivo**: `all-accounts.csv`

```csv
account,region
prod-frontend,us-east-1
prod-backend,us-east-1
prod-data,us-west-2
staging-frontend,us-east-1
staging-backend,us-east-1
dev-playground,us-east-1
```

**Comando**:

```bash
./generate-aws-inventory --use-letme --csv all-accounts.csv --init-cost
```

## Limitaciones

### Tamaño de Listas

Los archivos CSV pueden fallar con listas muy grandes debido a limitaciones de `letme`. Si tienes más de ~50 cuentas, considera:

1. **Dividir en múltiples archivos**:

   ```bash
   ./generate-aws-inventory --use-letme --csv prod-accounts.csv
   ./generate-aws-inventory --use-letme --csv dev-accounts.csv
   ```

2. **Usar archivos JSON** (más confiables para listas grandes)

3. **Scripts personalizados** (ver sección siguiente)

### Solo con letme

Los archivos de configuración **solo funcionan con `--use-letme`**. Para otros métodos de autenticación, usa scripts.

## Alternativa: Scripts Personalizados

Para mayor control, puedes crear scripts:

### Bash Script

```bash
#!/bin/bash

ACCOUNTS=("prod-us" "prod-eu" "staging-us")
REGIONS=("us-east-1" "eu-west-1" "us-east-1")

for i in "${!ACCOUNTS[@]}"; do
  account="${ACCOUNTS[$i]}"
  region="${REGIONS[$i]}"

  echo "Inventariando $account en $region..."
  ./generate-aws-inventory \
    --use-letme \
    --account "$account" \
    --region "$region" \
    --init-security
done
```

### Script con Perfiles AWS

```bash
#!/bin/bash

PROFILES=("prod" "staging" "dev")

for profile in "${PROFILES[@]}"; do
  echo "Inventariando perfil $profile..."
  ./generate-aws-inventory \
    --account "$profile" \
    --init-detailed \
    --export-format both
done
```

### Python Script

```python
#!/usr/bin/env python3

import subprocess
import json

# Cargar configuración
with open('accounts.json') as f:
    config = json.load(f)

for account in config['accounts']:
    name = account['name']
    region = account['region']

    print(f"Inventariando {name} en {region}...")

    cmd = [
        './generate-aws-inventory',
        '--use-letme',
        '--account', name,
        '--region', region,
        '--init-security',
        '--export-format', 'xlsx'
    ]

    subprocess.run(cmd, check=True)
```

## Casos de Uso

### Inventario Nocturno Automatizado

**Archivo**: `nightly-inventory.json`

```json
{
  "accounts": [
    { "name": "prod-main", "region": "us-east-1" },
    { "name": "prod-dr", "region": "us-west-2" },
    { "name": "staging", "region": "us-east-1" }
  ]
}
```

**Cron job**:

```bash
# Ejecutar todos los días a las 2 AM
0 2 * * * /path/to/generate-aws-inventory --use-letme --json /path/to/nightly-inventory.json --init-security --export-format both
```

### Auditoría Mensual

```bash
#!/bin/bash
# audit-monthly.sh

MONTH=$(date +%Y-%m)
OUTPUT_DIR="/audits/$MONTH"
mkdir -p "$OUTPUT_DIR"

./generate-aws-inventory \
  --use-letme \
  --json accounts.json \
  --init-security \
  --export-format xlsx

# Mover archivos a carpeta de auditoría
mv inventory-output/*.xlsx "$OUTPUT_DIR/"
```

### Comparación Multi-Región

**Archivo**: `multi-region.json`

```json
{
  "accounts": [
    { "name": "prod", "region": "us-east-1" },
    { "name": "prod", "region": "us-west-2" },
    { "name": "prod", "region": "eu-west-1" },
    { "name": "prod", "region": "ap-southeast-1" }
  ]
}
```

Esto genera un inventario de la misma cuenta en múltiples regiones.

## Validación de Archivos

### Validar JSON

```bash
# Con jq
jq empty accounts.json

# Con Python
python3 -c "import json; json.load(open('accounts.json'))"
```

### Validar CSV

```bash
# Verificar formato
head -1 accounts.csv
# Debe mostrar: account,region

# Contar cuentas (excluyendo encabezado)
tail -n +2 accounts.csv | wc -l
```

## Relacionado

- [Métodos de Autenticación](authentication.md)
- [Configurar TOTP](setup-totp.md)
- [Inventario Básico](init.md)
