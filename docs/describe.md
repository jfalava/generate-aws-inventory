# Descripciones Detalladas (`--describe`)

## Descripción

Genera descripciones detalladas en formato Markdown de los recursos inventariados. Acepta una carpeta de inventario, directorio padre (recursivo), o archivo CSV individual.

## Sintaxis

```bash
./generate-aws-inventory --describe <RUTA>
```

## Opciones de Ruta

### Carpeta específica

Procesa todos los archivos CSV en la carpeta:

```bash
./generate-aws-inventory --describe inventory-output/myaccount-us-east-1-20251116
```

### Directorio padre (recursivo)

Procesa todas las subcarpetas:

```bash
./generate-aws-inventory --describe inventory-output
```

### Archivo CSV individual

Procesa un servicio específico:

```bash
./generate-aws-inventory --describe inventory-output/myaccount-us-east-1-20251116/EC2-us-east-1-20251116-myaccount.csv
```

## Salida

Se crea un subdirectorio `detailed-describes/` dentro de la carpeta procesada:

```
inventory-output/myaccount-us-east-1-20251116/
├── EC2-us-east-1-20251116-myaccount.csv
├── RDS-us-east-1-20251116-myaccount.csv
└── detailed-describes/
    ├── EC2-detailed.md
    └── RDS-detailed.md
```

## Ejemplo de Salida Markdown

```markdown
# EC2 Detailed Description

## Instance: i-abc123 (web-server-1)

**Status:** running
**Type:** t3.large
**Launch Time:** 2024-01-15T10:30:00Z
**VPC:** vpc-xyz789

### Tags

- Environment: production
- Team: backend
- CostCenter: engineering
```

## Formato de Salida

Por defecto genera Markdown. Puedes especificar otros formatos:

```bash
./generate-aws-inventory --describe inventory-output/... --output json
./generate-aws-inventory --describe inventory-output/... --output text
```

## Relacionado

- [Descripciones Exhaustivas](describe-harder.md)
