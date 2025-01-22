// Configuración inicial de habitaciones
const configuracion = {
  pb: 4,
  p1: 6,
  p1c: 8,
  p2a: 10,
  p2b: 14
};

// Estado global de las habitaciones
let habitaciones = {};

// Cargar datos guardados o inicializar si no hay datos
function inicializarDatos() {
  const datosGuardados = localStorage.getItem('habitacionesData');
  if (datosGuardados) {
    habitaciones = JSON.parse(datosGuardados);
    // Actualizar habitaciones existentes con fecha de pago completa si no existe
    Object.keys(habitaciones).forEach(piso => {
      Object.keys(habitaciones[piso]).forEach(num => {
        if (!habitaciones[piso][num].fechaPagoCompleta) {
          habitaciones[piso][num].fechaPagoCompleta = '';
        }
      });
    });
  } else {
    Object.keys(configuracion).forEach(piso => {
      habitaciones[piso] = {};
      for (let i = 1; i <= configuracion[piso]; i++) {
        habitaciones[piso][i] = {
          estado: 'libre',
          precio: 0,
          pagado: 0,
          fechaPagoCompleta: ''
        };
      }
    });
    guardarDatos();
  }
}

// Guardar datos en localStorage
function guardarDatos() {
  localStorage.setItem('habitacionesData', JSON.stringify(habitaciones));
}

// Crear elementos de habitaciones
function crearHabitaciones() {
  const hoy = new Date();

  Object.keys(configuracion).forEach(piso => {
    const contenedor = document.getElementById(piso);
    contenedor.innerHTML = '';
    
    for (let i = 1; i <= configuracion[piso]; i++) {
      const habitacion = document.createElement('div');
      const hab = habitaciones[piso][i];
      
      // Verificar si está próximo a pagar (3 días antes)
      if (hab.estado === 'pagado' && hab.fechaPagoCompleta) {
        const fechaPago = new Date(hab.fechaPagoCompleta);
        const diferenciaDias = Math.ceil((fechaPago - hoy) / (1000 * 60 * 60 * 24));
        
        // Si faltan 3 días o menos para el pago y no es el mismo día
        if (diferenciaDias <= 3 && diferenciaDias > 0) {
          hab.estado = 'proximo';
        }
        // Si el día de pago ya pasó
        else if (diferenciaDias < 0) {
          hab.estado = 'atrasado';
        }
      }

      habitacion.className = `habitacion ${hab.estado}`;
      
      let fechaPagoInfo = '';
      if (hab.fechaPagoCompleta && hab.estado !== 'libre') {
        const fecha = new Date(hab.fechaPagoCompleta);
        fechaPagoInfo = `<div class="fecha-pago">Pago: ${fecha.toLocaleDateString()}</div>`;
      }

      habitacion.innerHTML = `
        <div>Habitación ${i}</div>
        <div>$${hab.precio}</div>
        ${fechaPagoInfo}
        ${hab.estado === 'parcial' ? 
          `<div>Pagado: $${hab.pagado}</div>
           <div>Resta: $${hab.precio - hab.pagado}</div>` 
          : ''}
      `;
      habitacion.onclick = () => abrirModal(piso, i);
      contenedor.appendChild(habitacion);
    }
  });
}

let habitacionActual = null;

// Abrir modal para editar habitación
function abrirModal(piso, numero) {
  habitacionActual = { piso, numero };
  const habitacion = habitaciones[piso][numero];
  
  document.getElementById('habitacion-numero').textContent = `${numero} (${piso.toUpperCase()})`;
  document.getElementById('estado').value = habitacion.estado;
  document.getElementById('precio').value = habitacion.precio;
  document.getElementById('pagado').value = habitacion.pagado || 0;
  document.getElementById('fecha-pago').value = habitacion.fechaPagoCompleta || '';
  
  actualizarSeccionPagoParcial(habitacion.estado === 'parcial');
  actualizarCantidadRestante();
  
  document.getElementById('modal').style.display = 'block';
}

// Cerrar modal
function cerrarModal() {
  document.getElementById('modal').style.display = 'none';
  habitacionActual = null;
}

// Actualizar sección de pago parcial
function actualizarSeccionPagoParcial(mostrar) {
  document.getElementById('pago-parcial-section').style.display = 
    mostrar ? 'block' : 'none';
}

// Calcular y actualizar cantidad restante
function actualizarCantidadRestante() {
  const precio = parseFloat(document.getElementById('precio').value) || 0;
  const pagado = parseFloat(document.getElementById('pagado').value) || 0;
  document.getElementById('restante').value = precio - pagado;
}

// Evento para actualizar cantidad restante cuando cambian los valores
document.getElementById('precio').addEventListener('input', actualizarCantidadRestante);
document.getElementById('pagado').addEventListener('input', actualizarCantidadRestante);

// Evento para mostrar/ocultar sección de pago parcial
document.getElementById('estado').addEventListener('change', function(e) {
  actualizarSeccionPagoParcial(e.target.value === 'parcial');
});

// Validar fecha de pago
function validarFechaPago(fecha) {
  const fechaObj = new Date(fecha);
  return !isNaN(fechaObj.getTime());
}

// Guardar cambios de la habitación
function guardarCambios() {
  if (!habitacionActual) return;
  
  const { piso, numero } = habitacionActual;
  const estado = document.getElementById('estado').value;
  const precio = parseFloat(document.getElementById('precio').value) || 0;
  const pagado = parseFloat(document.getElementById('pagado').value) || 0;
  const fechaPago = document.getElementById('fecha-pago').value;

  if (estado !== 'libre' && fechaPago && !validarFechaPago(fechaPago)) {
    alert('Por favor ingrese una fecha válida');
    return;
  }
  
  habitaciones[piso][numero] = {
    estado,
    precio,
    pagado: estado === 'parcial' ? pagado : 0,
    fechaPagoCompleta: estado === 'libre' ? '' : fechaPago
  };
  
  guardarDatos();
  crearHabitaciones();
  cerrarModal();
}

// Función para exportar datos en PDF
async function exportarPDF() {
  // Importar jsPDF y esperar a que se cargue
  const jsPDFModule = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const { jsPDF } = window.jspdf;
  
  const doc = new jsPDF();
  const fecha = new Date().toLocaleDateString();
  let yPos = 20;
  
  // Título
  doc.setFontSize(16);
  doc.text('Reporte de Gestión de Rentas', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(12);
  doc.text(`Fecha de exportación: ${fecha}`, 20, yPos);
  yPos += 15;

  // Iterar sobre cada piso
  Object.keys(configuracion).forEach(piso => {
    // Título del piso
    let nombrePiso = '';
    switch(piso) {
      case 'pb': nombrePiso = 'Planta Baja'; break;
      case 'p1': nombrePiso = 'Piso 1'; break;
      case 'p1c': nombrePiso = 'Piso 1 - Sección C'; break;
      case 'p2a': nombrePiso = 'Piso 2 - Sección A'; break;
      case 'p2b': nombrePiso = 'Piso 2 - Sección B'; break;
    }
    
    doc.setFontSize(14);
    doc.text(nombrePiso, 20, yPos);
    yPos += 10;
    
    // Información de habitaciones
    doc.setFontSize(10);
    Object.keys(habitaciones[piso]).forEach(num => {
      const hab = habitaciones[piso][num];
      let habInfo = `Habitación ${num}: `;
      habInfo += `Estado: ${hab.estado}, `;
      habInfo += `Precio: $${hab.precio}`;
      
      if (hab.estado === 'parcial') {
        habInfo += `, Pagado: $${hab.pagado}, Resta: $${hab.precio - hab.pagado}`;
      }
      
      if (hab.fechaPagoCompleta) {
        const fecha = new Date(hab.fechaPagoCompleta);
        habInfo += `, Fecha de pago: ${fecha.toLocaleDateString()}`;
      }

      // Verificar si necesitamos una nueva página
      if (yPos >= 280) {
        doc.addPage();
        yPos = 20;
      }

      doc.text(habInfo, 20, yPos);
      yPos += 7;
    });
    
    yPos += 10;
  });

  // Guardar el PDF
  doc.save(`gestion-rentas-${new Date().toISOString().split('T')[0]}.pdf`);
}

// Función para exportar datos (ahora con opción de formato)
function exportarDatos(formato = 'json') {
  if (formato === 'pdf') {
    exportarPDF();
    return;
  }

  const datosExportar = {
    fechaExportacion: new Date().toISOString(),
    datos: habitaciones
  };

  const jsonString = JSON.stringify(datosExportar, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  const fecha = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `gestion-rentas-${fecha}.json`;
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

// Función para mostrar notificación toast
function mostrarNotificacion(mensaje) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = mensaje;
  document.body.appendChild(toast);
  
  // Trigger reflow
  toast.offsetHeight;
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Función para actualizar cambios
async function actualizarCambios() {
  try {
    // Recargar datos del localStorage
    inicializarDatos();
    // Actualizar la visualización
    crearHabitaciones();
    // Mostrar notificación de éxito
    mostrarNotificacion('¡Cambios actualizados correctamente!');
  } catch (error) {
    console.error('Error al actualizar:', error);
    mostrarNotificacion('Error al actualizar los cambios');
  }
}

// Agregar evento para actualizar al cargar la página
window.addEventListener('storage', (e) => {
  if (e.key === 'habitacionesData') {
    inicializarDatos();
    crearHabitaciones();
  }
});

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
  inicializarDatos();
  crearHabitaciones();
});