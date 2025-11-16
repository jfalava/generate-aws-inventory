# Inventario de Costos (`--init-cost`)

## Descripción

Genera un inventario enfocado en **optimización de costos**. Identifica recursos sin uso, sobredimensionados o antiguos que pueden ser candidatos para limpieza o redimensionamiento.

## Sintaxis

```bash
./generate-aws-inventory --init-cost [OPCIONES]
```

## Columnas

| Columna          | Descripción                                      |
| ---------------- | ------------------------------------------------ |
| Type             | Tipo de servicio AWS                             |
| Name             | Nombre del recurso                               |
| Region           | Región de AWS                                    |
| ARN              | Amazon Resource Name                             |
| **State**        | Estado operacional                               |
| **Size**         | Tamaño/capacidad del recurso                     |
| **CreatedDate**  | Fecha de creación (identifica recursos antiguos) |
| **LastActivity** | Última actividad registrada                      |

## Ejemplos

```bash
# Con credenciales por defecto
./generate-aws-inventory --init-cost

# Con letme
./generate-aws-inventory --use-letme --account CUENTA --init-cost

# Exportar como Excel
./generate-aws-inventory --init-cost --export-format xlsx
```

## Salida

```
inventory-output/
└── init-cost-<accountId>-<YYYYMMDD>.csv
```

## Ejemplo CSV

```csv
Type,Name,Region,ARN,State,Size,CreatedDate,LastActivity
EC2,test-server,us-east-1,arn:aws:ec2:...,stopped,m5.4xlarge,2022-03-10,2023-01-05
EBS,unused-volume,us-west-2,arn:aws:ec2:...,available,500GB,2021-08-15,2022-12-20
RDS,old-database,eu-west-1,arn:aws:rds:...,available,db.r6g.8xlarge (2TB),2020-05-01,2024-10-30
```

## Casos de Uso

### Identificar recursos detenidos

```bash
grep "stopped" init-cost-*.csv
```

### Buscar volúmenes EBS no conectados

```bash
grep "EBS.*available" init-cost-*.csv
```

### Encontrar recursos antiguos sin uso reciente

Busca recursos creados hace más de 1 año sin actividad reciente.

## Relacionado

- [Inventario Básico](init.md)
- [Inventario de Seguridad](init-security.md)
