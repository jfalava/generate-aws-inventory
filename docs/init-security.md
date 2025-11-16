# Inventario de Seguridad (`--init-security`)

## Descripción

Genera un inventario consolidado de todos los recursos de AWS en todas las regiones habilitadas, enfocado específicamente en **auditorías de seguridad y cumplimiento**. Este modo incluye información crítica sobre encriptación, acceso público, aislamiento de red, y **detección automática de versiones obsoletas o deprecadas**.

## Sintaxis

```bash
./generate-aws-inventory --init-security [OPCIONES]
```

## Información Capturada

El modo de seguridad captura las siguientes columnas para cada recurso:

| Columna           | Descripción                                          |
| ----------------- | ---------------------------------------------------- |
| **Type**          | Tipo de servicio AWS (EC2, RDS, Lambda, etc.)        |
| **Name**          | Nombre o identificador del recurso                   |
| **Region**        | Región de AWS (o 'global' para servicios globales)   |
| **ARN**           | Amazon Resource Name completo                        |
| **State**         | Estado operacional del recurso                       |
| **Encrypted**     | Estado de encriptación (Yes/No/AES256/N/A)           |
| **PublicAccess**  | Nivel de accesibilidad pública                       |
| **VPC**           | ID de VPC asociada (si aplica)                       |
| **VersionStatus** | Estado de soporte de versión (ver sección siguiente) |

## Detección de Versiones Obsoletas

**Nueva funcionalidad**: El modo de seguridad ahora detecta automáticamente versiones obsoletas, deprecadas o que se acercan al fin de soporte en los siguientes servicios:

### EKS (Kubernetes)

Detecta versiones de Kubernetes que están:

- **Current**: Totalmente soportadas
- **Deprecated**: Se acercan al fin de soporte (incluye fecha EOL)
- **End of Life**: Ya no soportadas por AWS

**Ejemplo**: Un cluster EKS con Kubernetes 1.26 se marcará como "End of Life (2024-06-11)"

**Versiones monitoreadas**: 1.23 a 1.31

### Lambda (Runtimes)

Detecta runtimes deprecados o al fin de vida:

- **Python**: 2.7, 3.7-3.13
- **Node.js**: 12.x-22.x
- **Java**: 8, 11, 17, 21
- **.NET**: 3.1, 6, 8
- **Ruby**: 2.7, 3.2, 3.3
- **Go/Rust**: Runtimes personalizados (provided)

**Ejemplo**: Una función Lambda con Python 3.8 se marcará como "Deprecated (EOL 2024-10-14)"

### RDS (Motores de Base de Datos)

Detecta versiones de motores que están deprecadas o en soporte extendido:

- **PostgreSQL**: Versiones 10-16
- **MySQL**: Versiones 5.6-8.4
- **MariaDB**: Versiones 10.3-10.11
- **Aurora MySQL**: Versiones 5.7-8.0
- **Aurora PostgreSQL**: Versiones 11-16
- **SQL Server**: 2014-2022
- **Oracle**: 11-19

**Ejemplo**: Un RDS MySQL 5.7 se marcará como "Extended Support (ends 2024-02-29)"

### ElastiCache

Detecta versiones obsoletas de motores de caché:

- **Redis**: Versiones 5.0-7.1
- **Memcached**: Versiones 1.4-1.6

**Ejemplo**: Un cluster ElastiCache con Redis 6.0 se marcará como "Deprecated (EOL 2025-09-30)"

## Ejemplos de Uso

### Con credenciales por defecto

```bash
./generate-aws-inventory --init-security
```

### Con perfil de AWS (SSO o credentials)

```bash
./generate-aws-inventory --account my-sso-profile --init-security
```

### Con letme y MFA

```bash
./generate-aws-inventory --use-letme --account NOMBRE_CUENTA --init-security
```

### Exportar como Excel

```bash
./generate-aws-inventory --init-security --export-format xlsx
```

### Exportar en ambos formatos

```bash
./generate-aws-inventory --init-security --export-format both
```

### Limitar a regiones específicas (recomendado)

```bash
# Solo regiones de producción
./generate-aws-inventory --init-security --limit-regions us-east-1,eu-west-1

# Auditoría de regiones US
./generate-aws-inventory --init-security --limit-regions us-east-1,us-east-2,us-west-1,us-west-2

# Una sola región
./generate-aws-inventory --init-security --limit-regions us-east-1
```

**⚠️ Importante**: Sin `--limit-regions`, el escaneo puede tardar horas y causar errores de rate limit de AWS.

## Archivo de Salida

```
inventory-output/
└── init-security-<accountId>-<YYYYMMDD>.csv
```

O con Excel:

```
inventory-output/
└── init-security-<accountId>-<YYYYMMDD>.xlsx
```

## Ejemplo de Salida CSV

```csv
Type,Name,Region,ARN,State,Encrypted,PublicAccess,VPC,VersionStatus
RDS,prod-database,us-east-1,arn:aws:rds:us-east-1:123456789012:db:prod-database,available,Yes,Private,vpc-abc123,Current
Lambda,legacy-function,us-east-1,arn:aws:lambda:us-east-1:123456789012:function:legacy-function,python3.8,N/A,N/A,vpc-xyz789,Deprecated (EOL 2024-10-14)
EKS,old-cluster,us-west-2,arn:aws:eks:us-west-2:123456789012:cluster/old-cluster,ACTIVE (v1.26),N/A,Has Endpoint,N/A,End of Life (2024-06-11)
S3,sensitive-bucket,global,arn:aws:s3:::sensitive-bucket,active,AES256,Private,N/A,N/A
ElastiCache,cache-prod,us-east-1,arn:aws:elasticache:us-east-1:123456789012:cluster:cache-prod,available,N/A,N/A,N/A,Deprecated (EOL 2025-09-30)
EC2,web-server,us-east-1,arn:aws:ec2:us-east-1:123456789012:instance/i-abc123,running,Yes,Private,vpc-abc123,N/A
```

## Casos de Uso

### Auditoría de Seguridad

Identifica rápidamente:

- Recursos con datos sin encriptar
- Recursos expuestos públicamente
- Recursos fuera de VPCs
- **Servicios corriendo versiones con vulnerabilidades conocidas**

### Cumplimiento

Verifica que todos los recursos cumplen con:

- Políticas de encriptación
- Políticas de aislamiento de red
- **Políticas de versiones mínimas soportadas**

### Planificación de Actualizaciones

Usa la columna **VersionStatus** para:

- Identificar recursos que requieren actualización urgente (End of Life)
- Planificar migraciones antes del fin de soporte (Deprecated con fecha)
- Priorizar actualizaciones por criticidad

## Análisis de Resultados

### Filtrar recursos con versiones obsoletas

```bash
# Filtrar recursos deprecados o al final de vida
grep -E "Deprecated|End of Life" init-security-*.csv

# Contar recursos por estado de versión
grep "End of Life" init-security-*.csv | wc -l
```

### Importar a Excel para análisis

Si exportaste en formato Excel (`.xlsx`), puedes:

1. Abrir en Excel/LibreOffice
2. Filtrar por columna "VersionStatus"
3. Ordenar por "VersionStatus" para priorizar actualizaciones
4. Crear tablas dinámicas para visualizar distribución

### Script para generar reporte de versiones

```bash
#!/bin/bash
# Generar reporte de versiones obsoletas

SECURITY_FILE=$(ls -t inventory-output/init-security-*.csv | head -1)

echo "=== Recursos con Versiones Obsoletas ==="
echo ""

echo "End of Life (acción inmediata requerida):"
grep "End of Life" "$SECURITY_FILE" | cut -d',' -f1-3
echo ""

echo "Deprecated (planificar migración):"
grep "Deprecated" "$SECURITY_FILE" | cut -d',' -f1-3
echo ""

echo "Extended Support (verificar costos adicionales):"
grep "Extended Support" "$SECURITY_FILE" | cut -d',' -f1-3
```

## Mejores Prácticas

1. **Ejecuta regularmente**: Programa este comando mensualmente para monitorear el estado de seguridad

2. **Compara resultados**: Guarda inventarios históricos para rastrear mejoras o regresiones

3. **Prioriza actualizaciones**:
   - **End of Life**: Actualizar inmediatamente
   - **Deprecated con EOL próximo (<6 meses)**: Planificar actualización
   - **Extended Support**: Evaluar costos vs actualización

4. **Combina con otras herramientas**: Usa junto con:
   - AWS Security Hub
   - AWS Config Rules
   - Analizadores de cumplimiento (SOC2, ISO27001, etc.)

5. **Documenta excepciones**: Si un recurso debe permanecer en versión antigua, documenta la razón

## Limitaciones

- Los servicios globales (S3, CloudFront, Route53, IAM) se marcan con región "global"
- La columna VersionStatus solo se llena para EKS, Lambda, RDS y ElastiCache
- Los datos de versiones se basan en información pública de AWS y se deben actualizar periódicamente
- Algunos recursos pueden no tener información de VPC si no aplica

## Frecuencia de Actualización

La base de datos de versiones se actualiza con:

- Nuevas versiones de Kubernetes (EKS)
- Nuevos runtimes de Lambda
- Nuevas versiones de motores de RDS
- Cambios en políticas de soporte de AWS

Se recomienda actualizar la herramienta regularmente para tener la información más actualizada.

## Relacionado

- [Inventario Básico](init.md)
- [Inventario Detallado](init-detailed.md)
- [Inventario de Costos](init-cost.md)
- [Formato de Exportación](export-format.md)
