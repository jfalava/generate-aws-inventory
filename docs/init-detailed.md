# Inventario Detallado (`--init-detailed`)

## Descripción

Genera un inventario consolidado completo con **información extendida** sobre cada recurso. Incluye estado operacional, etiquetas, fechas, acceso público y dimensionamiento.

## Sintaxis

```bash
./generate-aws-inventory --init-detailed [OPCIONES]
```

## Columnas

| Columna          | Descripción                                            |
| ---------------- | ------------------------------------------------------ |
| Type             | Tipo de servicio AWS                                   |
| Name             | Nombre del recurso                                     |
| Region           | Región de AWS                                          |
| ARN              | Amazon Resource Name                                   |
| **State**        | Estado operacional (running, stopped, available, etc.) |
| **Tags**         | Etiquetas en formato JSON                              |
| **CreatedDate**  | Fecha de creación del recurso                          |
| **PublicAccess** | Nivel de acceso público                                |
| **Size**         | Tamaño/capacidad (tipo de instancia, GB, etc.)         |

## Ejemplos

```bash
# Con credenciales por defecto
./generate-aws-inventory --init-detailed

# Con perfil AWS
./generate-aws-inventory --account my-profile --init-detailed

# Con letme
./generate-aws-inventory --use-letme --account CUENTA --init-detailed

# Exportar como Excel
./generate-aws-inventory --init-detailed --export-format xlsx
```

## Salida

```
inventory-output/
└── init-detailed-<accountId>-<YYYYMMDD>.csv
```

## Ejemplo CSV

```csv
Type,Name,Region,ARN,State,Tags,CreatedDate,PublicAccess,Size
EC2,web-server,us-east-1,arn:aws:ec2:...,running,"{""Env"":""prod"",""Team"":""backend""}",2024-01-15,Public,t3.large
RDS,app-db,us-east-1,arn:aws:rds:...,available,"{""Project"":""api""}",2023-06-20,Private,db.r5.xlarge (500GB)
S3,data-lake,global,arn:aws:s3:::data-lake,active,"{""Owner"":""analytics""}",2023-01-10,Private,2.5TB
```

## Relacionado

- [Inventario Básico](init.md)
- [Inventario de Seguridad](init-security.md)
- [Inventario de Costos](init-cost.md)
