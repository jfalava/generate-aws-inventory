# Descripciones Exhaustivas (`--describe-harder`)

## Descripción

Genera descripciones exhaustivas con **toda la información disponible** en tablas Markdown estructuradas. Proporciona el máximo nivel de detalle para análisis profundo.

## Sintaxis

```bash
./generate-aws-inventory --describe-harder <ARCHIVO_CSV>
```

**Nota:** Solo acepta archivos CSV individuales, no carpetas.

## Servicios Soportados

Los siguientes servicios tienen formateadores personalizados con información completa:

- **EC2**: Security groups, volúmenes con puntos de montaje, interfaces de red, perfiles IAM, tags
- **RDS**: Subnet groups, security groups, parameter groups, configuración de backup, encriptación
- **RouteTable**: Todas las rutas con CIDRs de destino, targets, estado, asociaciones
- **SecurityGroup**: Reglas de entrada/salida completas con protocolos, puertos, orígenes/destinos
- **LoadBalancer**: Zonas de disponibilidad, subnets, security groups, tags
- **Lambda**: Variables de entorno, configuración VPC, layers, dead letter queue, concurrencia, tags
- **VPC**: Bloques CIDR (IPv4/IPv6), opciones DHCP, configuración DNS, tags
- **Subnet**: Bloques CIDR, IPs disponibles, configuración de asignación automática, IPv6, tags
- **NetworkAcl**: Reglas de entrada/salida con números de regla, protocolos, puertos, bloques CIDR, asociaciones de subnets

## Ejemplo de Uso

```bash
./generate-aws-inventory --describe-harder inventory-output/myaccount-us-east-1-20251116/EC2-us-east-1-20251116-myaccount.csv
```

## Salida

Se genera un archivo `comprehensive-<Servicio>.md` en el mismo directorio que el CSV:

```
inventory-output/myaccount-us-east-1-20251116/
├── EC2-us-east-1-20251116-myaccount.csv
└── comprehensive-EC2.md
```

## Ejemplo de Salida

### EC2 Instance

```markdown
## Instance: i-abc123 (web-server-prod)

| Propiedad  | Valor         |
| ---------- | ------------- |
| Estado     | running       |
| Tipo       | t3.large      |
| VPC        | vpc-xyz789    |
| Subnet     | subnet-abc123 |
| IP Privada | 10.0.1.50     |
| IP Pública | 54.123.45.67  |

### Security Groups

- sg-123456: web-server-sg
- sg-789012: common-sg

### Block Devices

| Dispositivo | Volumen    | Tamaño | Punto de Montaje |
| ----------- | ---------- | ------ | ---------------- |
| /dev/xvda   | vol-abc123 | 100GB  | /                |
| /dev/xvdb   | vol-def456 | 500GB  | /data            |

### Tags

- Environment: production
- Team: backend
- CostCenter: engineering
```

## Diferencia con --describe

| Característica   | --describe      | --describe-harder    |
| ---------------- | --------------- | -------------------- |
| Nivel de detalle | Básico          | Exhaustivo           |
| Formato          | Markdown simple | Tablas estructuradas |
| Entrada          | Carpeta/CSV     | Solo CSV             |
| Velocidad        | Rápido          | Más lento            |
| Llamadas API     | Mínimas         | Máximas              |

## Casos de Uso

- **Análisis de configuración detallada** de recursos críticos
- **Documentación completa** de infraestructura
- **Troubleshooting** de configuraciones complejas
- **Auditorías técnicas** profundas

## Relacionado

- [Descripciones Básicas](describe.md)
