# Lista Completa de Servicios

La herramienta inventaría **41 tipos diferentes de recursos** de AWS.

## Servicios por Categoría

### Computación (5)

| Servicio     | Código        | Descripción                      |
| ------------ | ------------- | -------------------------------- |
| Amazon EC2   | `EC2`         | Instancias de máquinas virtuales |
| AWS Lambda   | `Lambda`      | Funciones serverless             |
| Amazon ECS   | `ECS`         | Clusters de contenedores         |
| Amazon EKS   | `EKS`         | Clusters de Kubernetes           |
| Auto Scaling | `AutoScaling` | Grupos de auto-escalado          |

### Almacenamiento (4)

| Servicio   | Código   | Descripción                          |
| ---------- | -------- | ------------------------------------ |
| Amazon S3  | `S3`     | Buckets de almacenamiento de objetos |
| Amazon EBS | `EBS`    | Volúmenes de bloques                 |
| Amazon EFS | `EFS`    | Sistemas de archivos elásticos       |
| AWS Backup | `Backup` | Bóvedas de backup                    |

### Redes (15)

| Servicio               | Código             | Descripción                        |
| ---------------------- | ------------------ | ---------------------------------- |
| Amazon VPC             | `VPC`              | Redes virtuales privadas           |
| Subnets                | `Subnet`           | Subredes                           |
| Security Groups        | `SecurityGroup`    | Grupos de seguridad                |
| Route Tables           | `RouteTable`       | Tablas de enrutamiento             |
| Network ACLs           | `NetworkAcl`       | Listas de control de acceso de red |
| Network Interfaces     | `NetworkInterface` | Interfaces de red elásticas        |
| Elastic Load Balancing | `LoadBalancer`     | Balanceadores de carga             |
| NAT Gateway            | `NatGateway`       | Gateways NAT                       |
| Internet Gateway       | `InternetGateway`  | Gateways de internet               |
| Elastic IP             | `ElasticIP`        | Direcciones IP elásticas           |
| VPN Gateway            | `VpnGateway`       | Gateways VPN                       |
| VPN Connection         | `VpnConnection`    | Conexiones VPN                     |
| Transit Gateway        | `TransitGateway`   | Gateways de tránsito               |
| VPC Endpoint           | `VpcEndpoint`      | Endpoints de VPC                   |
| VPC Peering            | `VpcPeering`       | Conexiones de peering de VPC       |

### Bases de Datos (5)

| Servicio           | Código        | Descripción                     |
| ------------------ | ------------- | ------------------------------- |
| Amazon RDS         | `RDS`         | Bases de datos relacionales     |
| Amazon DynamoDB    | `DynamoDB`    | Bases de datos NoSQL            |
| Amazon Redshift    | `Redshift`    | Data warehouses                 |
| Amazon OpenSearch  | `OpenSearch`  | Clusters de búsqueda y análisis |
| Amazon ElastiCache | `ElastiCache` | Clusters de caché en memoria    |

### Seguridad e Identidad (6)

| Servicio            | Código           | Descripción                   |
| ------------------- | ---------------- | ----------------------------- |
| AWS IAM             | `IAM`            | Usuarios y roles de identidad |
| AWS KMS             | `KMS`            | Llaves de encriptación        |
| AWS Secrets Manager | `SecretsManager` | Gestión de secretos           |
| AWS WAF             | `WAF`            | Web Application Firewall      |
| Amazon GuardDuty    | `GuardDuty`      | Detección de amenazas         |
| Amazon Cognito      | `Cognito`        | User pools de autenticación   |

### Gestión y Monitoreo (6)

| Servicio            | Código           | Descripción                            |
| ------------------- | ---------------- | -------------------------------------- |
| Amazon CloudWatch   | `CloudWatch`     | Alarmas y métricas                     |
| AWS CloudFormation  | `CloudFormation` | Stacks de infraestructura como código  |
| AWS CloudTrail      | `CloudTrail`     | Logs de auditoría                      |
| AWS Systems Manager | `SSM`            | Parámetros y gestión                   |
| AWS Config          | `Config`         | Reglas de configuración y cumplimiento |
| Amazon CloudFront   | `CloudFront`     | Distribuciones CDN                     |

### Desarrollo (5)

| Servicio           | Código          | Descripción                     |
| ------------------ | --------------- | ------------------------------- |
| Amazon ECR         | `ECR`           | Repositorios de imágenes Docker |
| AWS Glue           | `Glue`          | Jobs ETL                        |
| AWS Step Functions | `StepFunctions` | Máquinas de estado              |
| Amazon EventBridge | `EventBridge`   | Reglas de eventos               |
| Amazon API Gateway | `APIGateway`    | APIs REST y HTTP                |

### Analítica (3)

| Servicio       | Código    | Descripción                        |
| -------------- | --------- | ---------------------------------- |
| Amazon Kinesis | `Kinesis` | Streams de datos en tiempo real    |
| Amazon Athena  | `Athena`  | Consultas SQL sobre S3             |
| Amazon EMR     | `EMR`     | Clusters de procesamiento big data |

### Integración (2)

| Servicio   | Código | Descripción               |
| ---------- | ------ | ------------------------- |
| Amazon SQS | `SQS`  | Colas de mensajes         |
| Amazon SNS | `SNS`  | Tópicos de notificaciones |

### Gobernanza (2)

| Servicio                 | Código         | Descripción                       |
| ------------------------ | -------------- | --------------------------------- |
| AWS Control Tower        | `ControlTower` | Guardrails organizacionales       |
| Service Control Policies | `SCP`          | Políticas de control de servicios |

### DNS (1)

| Servicio        | Código    | Descripción          |
| --------------- | --------- | -------------------- |
| Amazon Route 53 | `Route53` | Zonas hospedadas DNS |

## Servicios Globales vs Regionales

### Servicios Globales

Estos servicios se consultan una sola vez por cuenta y se marcan con región "global":

- S3
- CloudFront
- Route53
- IAM (Users, Roles)
- Control Tower
- Service Control Policies
- AWS Config (global)

### Servicios Regionales

Todos los demás servicios se consultan por cada región habilitada en la cuenta.

## Uso en Filtrado

Para inventariar servicios específicos, usa el parámetro `--services`:

```bash
# Solo computación
./generate-aws-inventory --services EC2,Lambda,ECS,EKS

# Solo bases de datos
./generate-aws-inventory --services RDS,DynamoDB,ElastiCache

# Solo red
./generate-aws-inventory --services VPC,Subnet,SecurityGroup
```

Ver [guía de filtrado de servicios](services.md) para más detalles.

## Información Capturada por Servicio

### Información Básica (todos los servicios)

- Nombre/ID del recurso
- ARN (Amazon Resource Name)
- Región
- Tags (cuando están disponibles)

### Información Específica

Varía por servicio. Por ejemplo:

**EC2**: Tipo de instancia, estado, IPs, VPC, encriptación de volúmenes
**RDS**: Motor, versión, clase de instancia, tamaño de almacenamiento, encriptación
**Lambda**: Runtime, versión, memoria, timeout, VPC
**EKS**: Versión de Kubernetes, estado del cluster, endpoint

## Relacionado

- [Filtrado de Servicios](services.md)
- [Inventario Básico](init.md)
- [Inventario de Seguridad](init-security.md)
