# Formato de Exportación (`--export-format`)

## Descripción

Configura el formato de salida de los inventarios. Soporta CSV, Excel (.xlsx), o ambos.

## Sintaxis

```bash
./generate-aws-inventory [COMANDO] --export-format <FORMATO>
```

## Formatos Disponibles

| Formato | Descripción                               | Extensión        |
| ------- | ----------------------------------------- | ---------------- |
| `csv`   | Valores separados por comas (por defecto) | `.csv`           |
| `xlsx`  | Libro de Excel                            | `.xlsx`          |
| `both`  | Genera ambos formatos                     | `.csv` y `.xlsx` |

## Ejemplos

### CSV (por defecto)

```bash
./generate-aws-inventory --init
# Genera: init-123456789012-20251116.csv
```

### Excel

```bash
./generate-aws-inventory --init --export-format xlsx
# Genera: init-123456789012-20251116.xlsx
```

### Ambos formatos

```bash
./generate-aws-inventory --init --export-format both
# Genera:
# - init-123456789012-20251116.csv
# - init-123456789012-20251116.xlsx
```

## Aplicable a Todos los Modos

```bash
# Inventario básico como Excel
./generate-aws-inventory --init --export-format xlsx

# Inventario detallado en ambos formatos
./generate-aws-inventory --init-detailed --export-format both

# Inventario de seguridad como Excel
./generate-aws-inventory --init-security --export-format xlsx

# Inventario de costos en ambos formatos
./generate-aws-inventory --init-cost --export-format both

# Inventario por servicio como Excel
./generate-aws-inventory --account myaccount --region us-east-1 --services EC2,RDS --export-format xlsx
```

## Ventajas de Cada Formato

### CSV

**Ventajas:**

- Ligero y rápido
- Compatible con cualquier herramienta
- Fácil de procesar con scripts
- Control de versiones (Git-friendly)

**Ideal para:**

- Automatización y scripts
- Procesamiento con herramientas CLI (grep, awk, etc.)
- Almacenamiento en repositorios

### Excel (.xlsx)

**Ventajas:**

- Formato profesional
- Filtrado y ordenamiento visual
- Tablas dinámicas
- Gráficos y visualizaciones
- Formato de celdas y colores

**Ideal para:**

- Presentaciones a stakeholders
- Análisis exploratorio
- Reportes ejecutivos
- Compartir con equipos no técnicos

### Ambos formatos

**Ventajas:**

- Lo mejor de ambos mundos
- CSV para automatización
- Excel para presentación

**Ideal para:**

- Equipos mixtos (técnicos y no técnicos)
- Reportes que requieren ambos usos

## Estructura de Archivo Excel

Los archivos Excel generados incluyen:

- **Encabezados en negrita** para fácil lectura
- **Ancho de columnas automático** basado en contenido
- **Filtros automáticos** habilitados en la primera fila
- **Una hoja por archivo** con el nombre del inventario

## Tamaño de Archivos

| Formato | Tamaño relativo  | Compresión                 |
| ------- | ---------------- | -------------------------- |
| CSV     | Base (1x)        | Alta con gzip              |
| Excel   | ~2-3x más grande | Incluye compresión interna |

Para inventarios muy grandes (>100,000 recursos), se recomienda CSV por rendimiento.

## Relacionado

- [Inventario Básico](init.md)
- [Inventario Detallado](init-detailed.md)
- [Inventario de Seguridad](init-security.md)
- [Inventario de Costos](init-cost.md)
