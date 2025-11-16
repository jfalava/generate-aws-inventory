# Documentación - AWS Inventory Generator

Guías completas para usar la herramienta de inventario de recursos AWS.

## 🚀 Empezar

- **[Guía de Inicio Rápido](quick-start.md)** - Primer inventario en 5 minutos

## 📚 Configuración

- **[Métodos de Autenticación](authentication.md)** - Credenciales, perfiles AWS y letme con MFA
- **[Configurar TOTP](setup-totp.md)** - Autenticación MFA para `letme`
- **[Configurar libsecret (Linux)](libsecret-setup.md)** - Instalación por distribución
- **[Archivos de Configuración](configuration-files.md)** - JSON y CSV para múltiples cuentas

## 📊 Modos de Inventario

- **[Inventario Básico (`--init`)](init.md)** - Vista rápida de todos los recursos
- **[Inventario Detallado (`--init-detailed`)](init-detailed.md)** - Información completa con tags y estado
- **[Inventario de Seguridad (`--init-security`)](init-security.md)** - Auditoría con detección de versiones obsoletas
- **[Inventario de Costos (`--init-cost`)](init-cost.md)** - Optimización y recursos sin uso

## 🔍 Descripciones Detalladas

- **[Descripciones (`--describe`)](describe.md)** - Detalles de recursos inventariados
- **[Descripciones Exhaustivas (`--describe-harder`)](describe-harder.md)** - Máximo detalle con tablas estructuradas

## ⚙️ Opciones

- **[Formato de Exportación](export-format.md)** - CSV, Excel o ambos
- **[Filtrado de Servicios](services.md)** - Inventariar servicios específicos
- **[Lista Completa de Servicios](services-list.md)** - 41 tipos de recursos soportados

## 📖 Estructura de las Guías

Cada guía incluye:

- **Descripción**: Qué hace y cuándo usarlo
- **Sintaxis**: Comandos con ejemplos
- **Ejemplos**: Casos de uso prácticos
- **Salida**: Estructura de archivos generados
- **Solución de problemas**: Errores comunes

## 🆘 Soporte

- [CLAUDE.md](../CLAUDE.md) - Arquitectura interna del proyecto
- [README.md](../README.md) - Vista general y enlaces rápidos
