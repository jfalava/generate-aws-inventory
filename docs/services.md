# Filtrado de Servicios (`--services`)

## Descripción

Permite inventariar solo servicios específicos de AWS en lugar de todos. Útil para análisis enfocados o inventarios parciales.

## Sintaxis

```bash
./generate-aws-inventory --services <LISTA_SERVICIOS> [OPCIONES]
```

## Formato de Lista

Lista separada por comas (sin espacios):

```bash
--services EC2,RDS,S3
```

O valor especial `all` para todos los servicios:

```bash
--services all
```

## Servicios Disponibles

### Computación

- `EC2` - Instancias EC2
- `Lambda` - Funciones Lambda
- `ECS` - Clusters ECS
- `EKS` - Clusters EKS
- `AutoScaling` - Grupos de Auto Scaling

### Almacenamiento

- `S3` - Buckets S3
- `EBS` - Volúmenes EBS
- `EFS` - Sistemas de archivos EFS
- `Backup` - Bóvedas de Backup

### Redes

- `VPC` - VPCs
- `Subnet` - Subnets
- `SecurityGroup` - Grupos de seguridad
- `RouteTable` - Tablas de rutas
- `NetworkAcl` - ACLs de red
- `NetworkInterface` - Interfaces de red
- `LoadBalancer` - Load Balancers
- `NatGateway` - NAT Gateways
- `InternetGateway` - Internet Gateways
- `ElasticIP` - IPs elásticas
- `VpnGateway` - VPN Gateways
- `VpnConnection` - Conexiones VPN
- `TransitGateway` - Transit Gateways
- `VpcEndpoint` - VPC Endpoints
- `VpcPeering` - Peering de VPC

### Bases de Datos

- `RDS` - Instancias RDS
- `DynamoDB` - Tablas DynamoDB
- `Redshift` - Clusters Redshift
- `OpenSearch` - Dominios OpenSearch
- `ElastiCache` - Clusters ElastiCache

### Seguridad

- `IAM` - Usuarios y roles IAM
- `KMS` - Llaves KMS
- `SecretsManager` - Secretos
- `WAF` - Web ACLs WAF
- `GuardDuty` - Detectores GuardDuty
- `Cognito` - User Pools Cognito

### Gestión

- `CloudWatch` - Alarmas CloudWatch
- `CloudFormation` - Stacks CloudFormation
- `CloudTrail` - Trails CloudTrail
- `SSM` - Parámetros SSM
- `Config` - Reglas de Config

### Desarrollo

- `ECR` - Repositorios ECR
- `Glue` - Jobs Glue
- `StepFunctions` - State Machines
- `EventBridge` - Reglas EventBridge
- `APIGateway` - APIs

### Analítica

- `Kinesis` - Streams Kinesis
- `Athena` - Workgroups Athena
- `EMR` - Clusters EMR

### Integración

- `SQS` - Colas SQS
- `SNS` - Tópicos SNS

### Gobernanza

- `ControlTower` - Guardrails
- `SCP` - Service Control Policies

## Ejemplos

### Servicios específicos

```bash
# Solo EC2 y RDS
./generate-aws-inventory --account myaccount --region us-east-1 --services EC2,RDS

# Solo recursos de red
./generate-aws-inventory --services VPC,Subnet,SecurityGroup,RouteTable

# Solo bases de datos
./generate-aws-inventory --services RDS,DynamoDB,ElastiCache,Redshift
```

### Todos los servicios

```bash
./generate-aws-inventory --services all --region us-east-1
```

### Combinación con modos de inventario

El filtrado de servicios **no funciona** con los modos `--init`, `--init-detailed`, `--init-security`, o `--init-cost`. Estos modos siempre inventarían todos los servicios.

```bash
# ❌ NO funciona
./generate-aws-inventory --init --services EC2,RDS

# ✅ Funciona
./generate-aws-inventory --account myaccount --region us-east-1 --services EC2,RDS
```

## Estructura de Salida

Cuando usas `--services`, se genera una carpeta con solo los servicios especificados:

```
inventory-output/
└── myaccount-us-east-1-20251116/
    ├── EC2-us-east-1-20251116-myaccount.csv
    └── RDS-us-east-1-20251116-myaccount.csv
```

## Casos de Uso

### Auditoría de computación

```bash
./generate-aws-inventory --services EC2,Lambda,ECS,EKS
```

### Revisión de bases de datos

```bash
./generate-aws-inventory --services RDS,DynamoDB,ElastiCache
```

### Análisis de red

```bash
./generate-aws-inventory --services VPC,Subnet,SecurityGroup,RouteTable,NatGateway
```

### Solo recursos de seguridad

```bash
./generate-aws-inventory --services IAM,KMS,SecretsManager,WAF,GuardDuty
```

## Rendimiento

Filtrar servicios reduce significativamente:

- **Tiempo de ejecución**: Solo consulta los servicios especificados
- **Llamadas API**: Menos requests a AWS
- **Tamaño de salida**: Archivos más pequeños

## Mejores Prácticas

1. **Usa filtrado cuando sabes qué necesitas**: Si solo te interesan ciertos servicios, filtra desde el inicio

2. **Para inventarios completos, usa `--init`**: Es más eficiente que listar todos los servicios manualmente

3. **Combina con exportación específica**:
   ```bash
   ./generate-aws-inventory --services EC2,RDS --export-format xlsx
   ```

## Relacionado

- [Inventario Básico](init.md)
- [Formato de Exportación](export-format.md)
