# Inventario Básico (`--init`)

## Descripción

Genera un inventario consolidado rápido de **todos los recursos de AWS** en **todas las regiones habilitadas**. Este modo proporciona una vista de alto nivel de todos los recursos en la cuenta con la información esencial.

Ideal para obtener una primera impresión de la infraestructura AWS de una cuenta.

## Sintaxis

```bash
./generate-aws-inventory --init [OPCIONES]
```

## Información Capturada

El modo básico captura únicamente las columnas esenciales:

| Columna    | Descripción                                                              |
| ---------- | ------------------------------------------------------------------------ |
| **Type**   | Tipo de servicio AWS (EC2, RDS, Lambda, S3, etc.)                        |
| **Name**   | Nombre o identificador del recurso                                       |
| **Region** | Región de AWS donde está el recurso (o 'global' para servicios globales) |
| **ARN**    | Amazon Resource Name completo                                            |

## Ejemplos de Uso

### Con credenciales por defecto

```bash
./generate-aws-inventory --init
```

Usa las credenciales configuradas en `~/.aws/credentials` o variables de entorno.

### Con perfil de AWS

```bash
./generate-aws-inventory --account my-profile --init
```

### Con perfil SSO

```bash
./generate-aws-inventory --account my-sso-profile --init
```

### Con letme y MFA

```bash
./generate-aws-inventory --use-letme --account NOMBRE_CUENTA --init
```

Requiere haber configurado TOTP previamente con `--setup-totp`.

### Exportar como Excel

```bash
./generate-aws-inventory --init --export-format xlsx
```

### Exportar en ambos formatos

```bash
./generate-aws-inventory --init --export-format both
```

Genera tanto CSV como Excel.

## Archivo de Salida

```
inventory-output/
└── init-<accountId>-<YYYYMMDD>.csv
```

Por ejemplo: `init-123456789012-20251116.csv`

Con formato Excel:

```
inventory-output/
└── init-<accountId>-<YYYYMMDD>.xlsx
```

## Ejemplo de Salida

```csv
Type,Name,Region,ARN
EC2,web-server-1,us-east-1,arn:aws:ec2:us-east-1:123456789012:instance/i-abc123
EC2,app-server-2,us-west-2,arn:aws:ec2:us-west-2:123456789012:instance/i-def456
RDS,production-db,us-east-1,arn:aws:rds:us-east-1:123456789012:db:production-db
S3,my-bucket,global,arn:aws:s3:::my-bucket
Lambda,data-processor,eu-west-1,arn:aws:lambda:eu-west-1:123456789012:function:data-processor
VPC,main-vpc,us-east-1,arn:aws:ec2:us-east-1:123456789012:vpc/vpc-xyz789
IAMUser,admin-user,global,arn:aws:iam::123456789012:user/admin-user
```

## Regiones Inventariadas

El comando consulta **todas las regiones habilitadas** en tu cuenta automáticamente:

- us-east-1, us-east-2, us-west-1, us-west-2
- eu-west-1, eu-west-2, eu-west-3, eu-central-1, eu-north-1
- ap-southeast-1, ap-southeast-2, ap-northeast-1, ap-northeast-2, ap-south-1
- sa-east-1
- ca-central-1
- Y cualquier otra región habilitada

Los servicios globales (S3, CloudFront, Route53, IAM) se marcan con región "global".

### Limitar Regiones con `--limit-regions`

**⚠️ Importante**: Escanear todas las regiones puede tomar **mucho tiempo** y causar **errores de límite de tasa** (rate limit) de la API de AWS.

Usa `--limit-regions` para escanear solo regiones específicas:

```bash
# Solo regiones de US East
./generate-aws-inventory --init --limit-regions us-east-1,us-east-2

# Regiones de producción
./generate-aws-inventory --init --limit-regions us-east-1,eu-west-1,ap-southeast-1

# Solo una región
./generate-aws-inventory --init --limit-regions us-east-1
```

**Beneficios**:

- ✅ Reduce tiempo de ejecución de horas a minutos
- ✅ Evita errores de rate limit de AWS
- ✅ Reduce costos de llamadas API
- ✅ Ideal para auditorías específicas de región

Si **NO** usas `--limit-regions`, la herramienta mostrará una advertencia sobre el tiempo de ejecución y posibles errores.

## Servicios Inventariados

La herramienta inventaría **41 tipos diferentes de recursos**:

### Computación

EC2, Lambda, ECS, EKS, Auto Scaling Groups

### Almacenamiento

S3, EBS, EFS, Backup Vaults

### Redes

VPC, Subnet, Security Groups, Route Tables, Network ACLs, Network Interfaces, Load Balancers, NAT Gateways, Internet Gateways, Elastic IPs, VPN Gateways, VPN Connections, Transit Gateways, VPC Endpoints, VPC Peering

### Bases de Datos

RDS, DynamoDB, Redshift, OpenSearch, ElastiCache

### Seguridad

IAM (Users, Roles), KMS, Secrets Manager, WAF, GuardDuty, Cognito

### Gestión

CloudWatch, CloudFormation, CloudTrail, SSM Parameters, Config Rules

### Desarrollo

ECR, Glue, CodeBuild, Step Functions

### Analítica

Kinesis, Athena, EMR

### Integración

SQS, SNS, EventBridge, API Gateway

### Gobernanza

Control Tower, Service Control Policies

## Casos de Uso

### Inventario rápido de cuenta nueva

```bash
./generate-aws-inventory --account nueva-cuenta --init
```

Obtén una vista completa de todos los recursos en minutos.

### Comparar cuentas

```bash
./generate-aws-inventory --account prod --init
./generate-aws-inventory --account staging --init

# Comparar archivos
diff inventory-output/init-*-prod-*.csv inventory-output/init-*-staging-*.csv
```

### Identificar recursos huérfanos

Busca recursos que no deberían existir o están mal nombrados.

### Reportes de cumplimiento

Genera un listado de todos los recursos para auditorías.

## Rendimiento

- **Tiempo estimado**: 5-15 minutos dependiendo del número de regiones y recursos
- **Requiere acceso de lectura** a todos los servicios AWS
- **No modifica** ningún recurso (solo operaciones de describe/list)

## Mejores Prácticas

1. **Ejecuta periódicamente**: Programa ejecuciones mensuales para rastrear cambios en la infraestructura

2. **Combina con otros modos**: Usa `--init` para visión general, luego `--init-detailed` o `--init-security` para información específica

3. **Guarda históricos**: Mantén copias de inventarios anteriores para comparación

4. **Analiza en Excel**: Exporta con `--export-format xlsx` para análisis con tablas dinámicas

## Limitaciones

- Solo captura información básica (nombre, tipo, región, ARN)
- No incluye detalles sobre estado, encriptación, tags, etc.
- Para información detallada, usa `--init-detailed`, `--init-security`, o `--init-cost`

## Próximos Pasos

Después de generar un inventario básico, puedes:

1. **Generar descripciones detalladas** de recursos específicos con [`--describe`](describe.md)
2. **Obtener información de seguridad** con [`--init-security`](init-security.md)
3. **Analizar costos** con [`--init-cost`](init-cost.md)
4. **Ver información completa** con [`--init-detailed`](init-detailed.md)

## Relacionado

- [Inventario Detallado](init-detailed.md)
- [Inventario de Seguridad](init-security.md)
- [Inventario de Costos](init-cost.md)
- [Formato de Exportación](export-format.md)
