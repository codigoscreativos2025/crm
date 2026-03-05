const pptxgen = require('pptxgenjs');

let pres = new pptxgen();

// Slide 1
let slide1 = pres.addSlide();
slide1.addText('Manual de Usuario CRM', { x: 1, y: 1.5, w: 8, fontSize: 44, bold: true, color: '363636', align: 'center' });
slide1.addText('Guía paso a paso para dominar la gestión de leads, embudos interactivos y respuestas de IA.', { x: 1.5, y: 3, w: 7, fontSize: 18, color: '666666', align: 'center' });

// Slide 2
let slide2 = pres.addSlide();
slide2.addText('¿Qué aprenderemos hoy?', { x: 0.5, y: 0.5, w: 9, fontSize: 32, bold: true, color: '363636' });
slide2.addText(
    [
        { text: '1. Introducción al CRM y Dashboard', options: { bullet: true } },
        { text: '2. Panel de Chats y Envío de Mensajes', options: { bullet: true } },
        { text: '3. Intervención Humana vs Inteligencia Artificial', options: { bullet: true } },
        { text: '4. Embudos de Venta: Creación y Gestión', options: { bullet: true } },
        { text: '5. Etapas: Clasificación de Prospectos', options: { bullet: true } },
        { text: '6. Respuestas Rápidas (Plantillas) y Etiquetas', options: { bullet: true } },
        { text: '7. Configuración de Cuenta y Administradores', options: { bullet: true } }
    ],
    { x: 0.5, y: 1.5, w: 9, fontSize: 20, color: '363636', lineSpacing: 28 }
);

// Slide 3
let slide3 = pres.addSlide();
slide3.addText('1. El Dashboard Ejecutivo', { x: 0.5, y: 0.5, w: 9, fontSize: 32, bold: true, color: '363636' });
slide3.addText('Monitorea tu Negocio en Tiempo Real', { x: 0.5, y: 1.0, w: 9, fontSize: 18, color: '666666', italic: true });
slide3.addText(
    [
        { text: 'El Dashboard es tu centro de mando. Te permite visualizar el pulso de las ventas.', options: { breakLine: true } },
        { text: 'KPIs Globales: Total de Leads, mensajes entrantes, y diálogos activos en los últimos 15 min.', options: { bullet: true } },
        { text: 'Velocidad de Respuesta: Compara el tiempo que tarda la IA vs tus agentes.', options: { bullet: true } },
        { text: 'Gráficas Dinámicas: Densidad de Embudos, Horas Pico, e Ingreso de Leads.', options: { bullet: true } }
    ],
    { x: 0.5, y: 1.8, w: 9, fontSize: 18, color: '363636', lineSpacing: 24 }
);

// Slide 4
let slide4 = pres.addSlide();
slide4.addText('2. Panel de Chats (Buzón Principal)', { x: 0.5, y: 0.5, w: 9, fontSize: 32, bold: true, color: '363636' });
slide4.addText('Navegando la Lista de Prospectos', { x: 0.5, y: 1.0, w: 9, fontSize: 18, color: '666666', italic: true });
slide4.addText(
    [
        { text: 'Centraliza todas las conversaciones entrantes de WhatsApp o Webhooks.', options: { breakLine: true } },
        { text: 'Barra Izquierda: Lista ordenada. Arriba están los no leídos (notificación verde).', options: { bullet: true } },
        { text: 'Buscador Inteligente: Filtra clientes por nombre, teléfono o etiqueta.', options: { bullet: true } },
        { text: 'Filtros Superiores: Clasifica chats por "Todos", "Activos" o un Embudo específico.', options: { bullet: true } }
    ],
    { x: 0.5, y: 1.8, w: 9, fontSize: 18, color: '363636', lineSpacing: 24 }
);

// Slide 5
let slide5 = pres.addSlide();
slide5.addText('3. ¿Cómo Enviar Mensajes?', { x: 0.5, y: 0.5, w: 9, fontSize: 32, bold: true, color: '363636' });
slide5.addText('Conversando con tus Leads', { x: 0.5, y: 1.0, w: 9, fontSize: 18, color: '666666', italic: true });
slide5.addText(
    [
        { text: 'Paso 1: Haz clic en un contacto de la barra lateral izquierda.', options: { bullet: true } },
        { text: 'Paso 2: En el panel central, verás el historial completo. Abajo tienes la barra de escritura.', options: { bullet: true } },
        { text: 'Paso 3: Escribe tu texto y presiona "Enter" o el botón de Enviar.', options: { bullet: true } },
        { text: '¡Súper poder! Envía notas de audio e imágenes directamente con las utilidades de attachment.', options: { bullet: true } }
    ],
    { x: 0.5, y: 1.8, w: 9, fontSize: 18, color: '363636', lineSpacing: 24 }
);

// Slide 6
let slide6 = pres.addSlide();
slide6.addText('4. Inteligencia Artificial vs Humano', { x: 0.5, y: 0.5, w: 9, fontSize: 32, bold: true, color: '363636' });
slide6.addText('Tomando el Control de la Conversación', { x: 0.5, y: 1.0, w: 9, fontSize: 18, color: '666666', italic: true });
slide6.addText(
    [
        { text: 'Tu CRM tiene un bot integrado, pero tú decides cuándo intervenir.', options: { breakLine: true } },
        { text: 'Pausar la IA: Si un cliente requiere atención especializada, simplemente escribe un mensaje manualmente y el bot se quedará en silencio.', options: { bullet: true } },
        { text: 'Silencio Automático: El sistema pausará a la IA temporalmente (por defecto 60 min).', options: { bullet: true } },
        { text: 'Reactivar la IA: Utiliza el toggle "Estado AI" en la cabecera del chat para encenderla.', options: { bullet: true } }
    ],
    { x: 0.5, y: 1.8, w: 9, fontSize: 18, color: '363636', lineSpacing: 24 }
);

// Slide 7
let slide7 = pres.addSlide();
slide7.addText('5. ¿Qué son los Embudos de Venta?', { x: 0.5, y: 0.5, w: 9, fontSize: 32, bold: true, color: '363636' });
slide7.addText('Organiza tu Flujo Comercial', { x: 0.5, y: 1.0, w: 9, fontSize: 18, color: '666666', italic: true });
slide7.addText(
    [
        { text: 'Un embudo representa un proceso de negocio completo (ej. Venta, Soporte, Consultoría).', options: { bullet: true } },
        { text: 'Permiten separar diferentes unidades de negocio dentro de la misma cuenta.', options: { bullet: true } },
        { text: 'Cada prospecto pertenece a un solo embudo a la vez.', options: { bullet: true } }
    ],
    { x: 0.5, y: 1.8, w: 9, fontSize: 18, color: '363636', lineSpacing: 24 }
);

// Slide 8
let slide8 = pres.addSlide();
slide8.addText('6. Gestión de Embudos y Etapas', { x: 0.5, y: 0.5, w: 9, fontSize: 32, bold: true, color: '363636' });
slide8.addText('Creando tu Proceso Personalizado', { x: 0.5, y: 1.0, w: 9, fontSize: 18, color: '666666', italic: true });
slide8.addText(
    [
        { text: 'Ve al menú Embudos en la barra lateral izquierda.', options: { breakLine: true } },
        { text: 'Crear un Embudo: Haz clic en "+ Nuevo Embudo", asígnale un nombre descriptivo.', options: { bullet: true } },
        { text: 'Crear Etapas: Haz clic sobre el embudo. Selecciona "+ Nueva Etapa".', options: { bullet: true } },
        { text: '¿Qué es una Etapa? Los pasos internos de cierre (Ej. Nuevo, Negociando, Cierre).', options: { bullet: true } },
        { text: 'Mover Contactos: Cambia el de embudo en el panel derecho del Chat.', options: { bullet: true } }
    ],
    { x: 0.5, y: 1.8, w: 9, fontSize: 18, color: '363636', lineSpacing: 24 }
);

// Slide 9
let slide9 = pres.addSlide();
slide9.addText('7. Respuestas Rápidas y Etiquetas', { x: 0.5, y: 0.5, w: 9, fontSize: 32, bold: true, color: '363636' });
slide9.addText('Herramientas de Ahorro de Tiempo', { x: 0.5, y: 1.0, w: 9, fontSize: 18, color: '666666', italic: true });
slide9.addText(
    [
        { text: 'Etiquetas (Tags): Mapea intereses (Ej. VIP, Mayorista) en el panel derecho. Se graficarán en el Dashboard de Datos.', options: { bullet: true } },
        { text: 'Plantillas de Respuesta: Guarda textos repetitivos. Úsalos en el chat escribiendo \'/\' y ahorra tiempo mecanográfico.', options: { bullet: true } }
    ],
    { x: 0.5, y: 1.8, w: 9, fontSize: 18, color: '363636', lineSpacing: 24 }
);

// Slide 10
let slide10 = pres.addSlide();
slide10.addText('8. Configuración de Cuenta y Usuarios', { x: 0.5, y: 0.5, w: 9, fontSize: 32, bold: true, color: '363636' });
slide10.addText('Administrando a tu Equipo', { x: 0.5, y: 1.0, w: 9, fontSize: 18, color: '666666', italic: true });
slide10.addText(
    [
        { text: 'Invitando Agentes: En el menú del perfil izquierdo puedes registrar a tus vendedores.', options: { bullet: true } },
        { text: 'Sus datos estarán interconectados pero con permisos aislados.', options: { bullet: true } },
        { text: 'Rol Admin: Únicamente los dueños pueden acceder a Reportísticas y descargas de PDFs/Excel poblados con todas las conversiones de la empresa.', options: { bullet: true } }
    ],
    { x: 0.5, y: 1.8, w: 9, fontSize: 18, color: '363636', lineSpacing: 24 }
);

// Slide 11
let slide11 = pres.addSlide();
slide11.addText('¡Estás Listo para Vender Más!', { x: 1, y: 2, w: 8, fontSize: 44, bold: true, color: '363636', align: 'center' });
slide11.addText('Aprovecha las métricas, cuida tus tiempos de respuesta y no dejes enfriar a tus Leads.', { x: 1.5, y: 3.5, w: 7, fontSize: 20, color: '666666', align: 'center' });

pres.writeFile({ fileName: 'Presentacion_CRM_Manual.pptx' }).then(fileName => {
    console.log(`created file: ${fileName}`);
});
