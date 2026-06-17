# Medi-alert

Usa la skill `using-superpowers` para mejorar el requerimiento, planear y ejecutar el desarrollo, y apóyate con la skill de `ux-ui-pro-max` para crear los diseños de iconos e interfaz de usuario.

## Descripcion

Esta aplicación debe ayudarme a registrar medicamentos y recordar al usuario cuando debe de tomarlas.

## Desarrollo

Quiero una aplicación que sea multiplataforma: windows, android, linux, etc. Debe usarse react como framework. Debe tener tema claro y oscuro.

## Vistas

Descripcion de lo que el usuario vera el usuario.

### Principal

El usuario vera en la parte superior siete dias empezando con el domingo y remarcar de alguna forma el dia actual, y abajo de ese decir 'Hoy es [DIA] de [MES]'. En la parte central las dosis que debera tomar durante el dias algo como:

```txt
--------------------------------
D    L    M    X    J    V    S
14   15   16   17   18   19   20
--------------------------------

6:00 a.m.   [BOTON Marcar dosis]
-------     Paracetamol
|icono|     Tomar [n] pastillas
-------     [ESTATUS = Se tomo, se salto, pendiente]

10:00 a.m.   [BOTON Marcar dosis]
-------     Paracetamol
|icono|     Tomar [n] pastillas
-------     [ESTATUS = Se tomo, se salto, pendiente]
-------     Suero
|icono|     Tomar [n] ml
-------     [ESTATUS = Se tomo, se salto, pendiente]

10:00 p.m.   [BOTÓN Marcar dosis]
-------     Paracetamol
|icono|     Aplicar [n] n gotas
-------     [ESTATUS = Se tomo, se salto, pendiente]

                       [BOTÓN FLOTANTE CON ACCIONES icono +]
                       [ Opción: agrega tratamiento]
                       [ Opción: agrega medicamento]

--------------------------------
ICONO  |  ICONO         | ICONO
inicio | Medicamentos   | Mas
--------------------------------
```

### [BOTÓN Marcar dosis]

Al dar click en el icono del medicamento de la lista se agregara un pequeño icono extra de check.

### Agregar tratamiento

Esta se va a accionar a dar clic en agregar medicina nueva, tipo wizard.

El flujo seria:

1. Capturar nombre medicina o si ya existe seguirá con wizard pero va a sugerir lo que actualmente existe.
2. Seleccionar la presentacion: Pastilla, Capsula, Tableta, Inyección, Solución, Gotas, Inhalador, Otro. También podrá editar si es mg, ml, etc, etc.
   2.1 - Podrá opcionalmente indicar con icono el tipo y el color.
3. Indicar la frecuencia (Aplica para todos excepto Otro), opciones:
   - Selecciona la frecuencia
     - Cada dia; el flujo es:
       - Una vez > Se captura [N] de [Presentacion] y se captura la hora.
       - Dos veces al dia:
       - Se captura Dosis #1 [N] de [Presentacion] y se captura la hora.
       - Se captura Dosis #2 [N] de [Presentacion] y se captura la hora.
       - Tres veces al dia:
       - Se captura Dosis #1 [N] de [Presentacion] y se captura la hora.
       - Se captura Dosis #2 [N] de [Presentacion] y se captura la hora.
       - Se captura Dosis #3 [N] de [Presentacion] y se captura la hora.
       - N veces al dia:
       - Se muestra un carrusel de 4 ... 25 (el usuario tiene que seleccionar la cantidad)
       - Se captura Dosis #1 [N] de [Presentacion] y se captura la hora.
       - ...
       - Se captura Dosis #N [N] de [Presentacion] y se captura la hora.
     - Dias específicos de la semana; el flujo es:
       - Lista de los dias y click para indicar que dias.
       - Se captura Dosis [N] de [Presentacion] y se captura la hora.
     - Cada X días
       - Se muestra un carrusel de 1 ... 31 (el usuario tiene que seleccionar el dia del mes)
       - Se especifica dia, mes, año.
       - Se captura Dosis [N] de [Presentacion] y se captura la hora.
     - Cada X semanas
       - Se muestra un carrusel de 1 ... 25 (el usuario tiene que seleccionar cada cuantas semanas)
       - Se especifica dia, mes, año.
       - Se captura Dosis [N] de [Presentacion] y se captura la hora.
     - Cada X meses
       - Se muestra un carrusel de 1 ... 12 (el usuario tiene que seleccionar los meses)
       - Se especifica dia, mes, año.
       - Se captura Dosis [N] de [Presentacion] y se captura la hora.
     - Según sea necesario. (No es necesario alertas)
   - Establece la duración del tratamiento (ayúdame a definir como deberia de poner esto, el caso de por dia se puede poner cuantos dias va a durar y automáticamente calcularia el dia ultimo pero en el caso de las demás no se como describirlo).
4. Se guarda el tratamiento y aparecen en los días indicados.

### Agregar medicamento

Aquí se va administrar el catalogo de medicamentos, tipo wizard. El flujo es:

1. Capturar nombre del medicamento y validar que no existe.
2. Seleccionar la presentacion: Pastilla, Capsula, Tableta, Inyección, Solución, Gotas, Inhalador, Otro. También podrá editar si es mg, ml, etc, etc.
   2.1 - Podrá opcionalmente indicar con icono el tipo y el color.
3. Seleccionara la dosis: si es gotas, ml, pastilla, capsula, etc.

### Alertas

Según el tipo de sistema operativo.

### iconos

Para el caso de los iconos de medicamentos es necesario que se cree una libreria pequeña o se busque alguna donde tenga iconos de pastillas, tabletas, jeringa, etc, etc.
