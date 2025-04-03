// Definir showPasswordModal fuera de DOMContentLoaded, al inicio del archivo
window.showPasswordModal = function(action) {
    const modal = document.getElementById('passwordModal');
    const closeBtn = document.querySelector('.close-modal');
    const submitBtn = document.getElementById('submitPassword');
    const passwordInput = document.getElementById('passwordInput');

    modal.style.display = "block";

    closeBtn.onclick = function() {
        modal.style.display = "none";
        passwordInput.value = '';
    }

    submitBtn.onclick = function() {
        // Aquí iría la lógica de verificación de contraseña
        alert('Acceso denegado');
        passwordInput.value = '';
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
            passwordInput.value = '';
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const addDeviceBtn = document.getElementById('addDevice');
    const refreshMapBtn = document.getElementById('refreshMap');
    const deviceList = document.querySelector('.device-list');
    const SCRIPT_ID = 'AKfycbyjnqbr-00qLSAVCvT2ddRNWIys4rHFbHS4_n2bShCM'; // Reemplazar con el ID del script desplegado
    const sidebar = document.querySelector('.sidebar');
    const toggleSidebarBtn = document.getElementById('toggleSidebar');

    // Inicializar el mapa
    const map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Crear icono personalizado de auto
    const carIcon = L.icon({
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/171/171239.png',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        popupAnchor: [0, -19],
        className: 'car-icon'
    });

    // Objeto para almacenar marcadores
    let markers = {};
    let isAddingDevice = false;

    // Función para cargar datos usando JSONP
    function loadVehiclesData() {
        const callbackName = 'callback_' + Date.now();
        
        window[callbackName] = function(data) {
            console.log('Datos recibidos:', data);
            if (data.error) {
                console.error('Error del servidor:', data.error);
                return;
            }
            processVehiclesData(data);
            delete window[callbackName];
            const script = document.querySelector(`script[data-callback="${callbackName}"]`);
            if (script) script.remove();
        };

        const script = document.createElement('script');
        // Usar la URL de la Web App (no la URL de desarrollo)
        const url = `https://script.google.com/macros/s/AKfycbyjnqbr-00qLSAVCvT2ddRNWIys4rHFbHS4_n2bShCM/dev?callback=${callbackName}`;
        console.log('Solicitando datos a:', url);
        script.src = url;
        script.dataset.callback = callbackName;
        script.onerror = function(error) {
            console.error('Error al cargar el script:', error);
        };
        document.body.appendChild(script);
    }

    // Función para procesar los datos de vehículos
    function processVehiclesData(vehicles) {
        // Limpiar marcadores existentes
        Object.values(markers).forEach(marker => marker.remove());
        markers = {};
        
        // Limpiar lista de dispositivos
        const deviceListItems = document.querySelectorAll('.device');
        deviceListItems.forEach(item => item.remove());

        // Separar vehículos en online y offline
        const onlineVehicles = [];
        const offlineVehicles = [];

        vehicles.forEach(vehicle => {
            if (vehicle.unidad) {
                const posInicial = parseCoordinates(vehicle.posInicial);
                const isOnline = posInicial && posInicial.lat && posInicial.lng;
                
                if (isOnline) {
                    onlineVehicles.push(vehicle);
                } else {
                    offlineVehicles.push(vehicle);
                }
            }
        });

        // Ordenar los vehículos online por nombre
        onlineVehicles.sort((a, b) => a.unidad.localeCompare(b.unidad));
        
        // Ordenar los vehículos offline por nombre
        offlineVehicles.sort((a, b) => a.unidad.localeCompare(b.unidad));

        // Procesar primero los vehículos online
        onlineVehicles.forEach(vehicle => {
            const posInicial = parseCoordinates(vehicle.posInicial);
            const posFinal = parseCoordinates(vehicle.posFinal);
            createDevice(vehicle.unidad, posInicial, posFinal, vehicle.popup);
        });

        // Luego procesar los vehículos offline
        offlineVehicles.forEach(vehicle => {
            const posInicial = null;
            const posFinal = null;
            createDevice(vehicle.unidad, posInicial, posFinal, vehicle.popup);
        });
    }

    // Función para parsear coordenadas "lat,lng"
    function parseCoordinates(coordStr) {
        if (!coordStr) return null;
        const [lat, lng] = coordStr.split(',').map(Number);
        // Verificar que las coordenadas sean números válidos
        if (isNaN(lat) || isNaN(lng)) return null;
        return { lat, lng };
    }

    // Función para crear un popup más profesional
    function createCustomPopup(deviceName, popupText, coordinates) {
        return `
            <div class="custom-popup">
                <div class="header">
                    <div class="vehicle-name">
                        ${deviceName}
                        <span class="status-badge">En movimiento</span>
                    </div>
                </div>
                <div class="info-row">
                    <i class="fas fa-info-circle"></i>
                    ${popupText}
                </div>
                <div class="info-row">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="coordinates">
                        ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}
                    </span>
                </div>
                <div class="action-buttons">
                    <div class="action-button" onclick="window.showPasswordModal('Ruta')">
                        <i class="fas fa-route"></i>
                        Ruta
                    </div>
                    <div class="action-button" onclick="window.showPasswordModal('Historial')">
                        <i class="fas fa-history"></i>
                        Historial
                    </div>
                    <div class="action-button" onclick="window.showPasswordModal('Config')">
                        <i class="fas fa-cog"></i>
                        Config
                    </div>
                </div>
            </div>
        `;
    }

    // Función para mover un marcador hacia su destino
    function moveMarkerToDestination(marker, start, end, deviceName, popupText) {
        const steps = 300; // Mantener 300 pasos
        const stepDelay = 5000; // Mantener 5 segundos entre cada paso
        let currentStep = 0;

        function step() {
            if (currentStep >= steps) return;
            
            currentStep++;
            const progress = currentStep / steps;
            
            const newLat = start.lat + (end.lat - start.lat) * progress;
            const newLng = start.lng + (end.lng - start.lng) * progress;
            const currentPos = { lat: newLat, lng: newLng };
            
            marker.setLatLng([newLat, newLng]);
            marker.bindPopup(createCustomPopup(deviceName, popupText, currentPos));
            
            setTimeout(() => step(), stepDelay);
        }
        
        step();
    }

    // Función para crear dispositivo
    function createDevice(unidad, posInicial, posFinal, popupText) {
        const deviceElement = document.createElement('div');
        deviceElement.className = 'device';
        
        // Determinar si el dispositivo está online (tiene coordenadas) o offline
        const isOnline = posInicial && posInicial.lat && posInicial.lng;
        const statusClass = isOnline ? 'online' : 'offline';
        
        deviceElement.innerHTML = `
            <i class="fas fa-car"></i>
            <span>${unidad}</span>
            <span class="status ${statusClass}"></span>
        `;
        
        const devices = deviceList.querySelector('h2');
        devices.insertAdjacentElement('afterend', deviceElement);

        // Solo crear el marcador si hay coordenadas válidas
        if (isOnline) {
            const marker = L.marker([posInicial.lat, posInicial.lng], {
                icon: carIcon
            })
                .bindPopup(createCustomPopup(unidad, popupText, posInicial))
                .addTo(map);
            
            // Agregar evento de clic al elemento del dispositivo
            deviceElement.addEventListener('click', function() {
                // Limpiar selección anterior
                document.querySelectorAll('.device').forEach(d => d.classList.remove('selected'));
                deviceElement.classList.add('selected');
                
                console.log('Centrando mapa en:', unidad);
                map.setView(marker.getLatLng(), 16, {
                    animate: true,
                    duration: 1
                });
                marker.openPopup();
            });
            
            markers[unidad] = marker;
            
            if (posFinal && posFinal.lat && posFinal.lng) {
                moveMarkerToDestination(marker, posInicial, posFinal, unidad, popupText);
            }
        } else {
            // Agregar evento de clic para dispositivos offline
            deviceElement.addEventListener('click', function() {
                // Limpiar selección anterior
                document.querySelectorAll('.device').forEach(d => d.classList.remove('selected'));
                deviceElement.classList.add('selected');
                
                // Crear un popup personalizado para unidades no asignadas
                const customAlert = document.createElement('div');
                customAlert.className = 'custom-popup';
                customAlert.innerHTML = `
                    <div class="header">
                        <div class="vehicle-name">
                            ${unidad}
                            <span class="status-badge" style="background: #dc3545;">Sin asignar</span>
                        </div>
                    </div>
                    <div class="info-row">
                        <i class="fas fa-exclamation-circle" style="color: #dc3545;"></i>
                        Unidad no asignada
                    </div>
                `;

                // Mostrar el popup usando SweetAlert o crear un popup personalizado
                const popupContent = customAlert.outerHTML;
                const popup = L.popup()
                    .setLatLng(map.getCenter())
                    .setContent(popupContent)
                    .openOn(map);
            });
        }
    }

    // Cargar datos iniciales
    loadVehiclesData();

    // Actualizar datos cada 30 segundos
    setInterval(loadVehiclesData, 30000);

    // Botón de actualizar
    refreshMapBtn.addEventListener('click', loadVehiclesData);

    // Función para mover un marcador aleatoriamente
    function moveMarkerRandomly(marker, deviceName) {
        const currentPos = marker.getLatLng();
        const radius = 0.01; // Radio máximo de movimiento (aproximadamente 1km)
        
        // Generar nuevo desplazamiento aleatorio
        const newLat = currentPos.lat + (Math.random() - 0.5) * radius;
        const newLng = currentPos.lng + (Math.random() - 0.5) * radius;
        
        // Mover el marcador suavemente
        marker.setLatLng([newLat, newLng], {
            animate: true,
            duration: 2 // duración en segundos
        });
        
        // Actualizar el popup con las nuevas coordenadas
        marker.bindPopup(`${deviceName}<br>Lat: ${newLat.toFixed(4)}<br>Lng: ${newLng.toFixed(4)}`);
        
        // Programar el siguiente movimiento
        setTimeout(() => moveMarkerRandomly(marker, deviceName), 3000); // Mover cada 3 segundos
    }

    // Función para crear un nuevo dispositivo con coordenadas específicas
    function createDeviceWithCoordinates(latlng) {
        const deviceNumber = document.querySelectorAll('.device').length + 1;
        const deviceName = `Dispositivo ${deviceNumber}`;
        const deviceElement = document.createElement('div');
        deviceElement.className = 'device';
        deviceElement.innerHTML = `
            <i class="fas fa-car"></i>
            <span>${deviceName}</span>
            <span class="status online"></span>
        `;
        
        const devices = deviceList.querySelector('h2');
        devices.insertAdjacentElement('afterend', deviceElement);

        const marker = L.marker(latlng, {
            draggable: true,
            icon: carIcon
        })
            .bindPopup(`${deviceName}`)
            .addTo(map);

        marker.on('dragend', function(e) {
            const pos = e.target.getLatLng();
            marker.bindPopup(`${deviceName}<br>Lat: ${pos.lat.toFixed(4)}<br>Lng: ${pos.lng.toFixed(4)}`);
        });
        
        markers[deviceName] = marker;
        
        // Iniciar el movimiento aleatorio
        moveMarkerRandomly(marker, deviceName);
        
        isAddingDevice = false;
        addDeviceBtn.classList.remove('active');
    }

    // Modo de agregar dispositivo
    addDeviceBtn.addEventListener('click', function() {
        isAddingDevice = !isAddingDevice;
        this.classList.toggle('active');
        
        if (isAddingDevice) {
            map.getContainer().style.cursor = 'crosshair';
        } else {
            map.getContainer().style.cursor = '';
        }
    });

    // Escuchar clics en el mapa
    map.on('click', function(e) {
        if (isAddingDevice) {
            createDeviceWithCoordinates(e.latlng);
            map.getContainer().style.cursor = '';
        }
    });

    // Hacer los dispositivos clickeables
    deviceList.addEventListener('click', function(e) {
        const device = e.target.closest('.device');
        if (device) {
            // Limpiar selección anterior
            document.querySelectorAll('.device').forEach(d => d.classList.remove('selected'));
            device.classList.add('selected');

            const deviceName = device.querySelector('span').textContent;
            console.log('Dispositivo clickeado:', deviceName); // Para debug

            const marker = markers[deviceName];
            if (marker) {
                console.log('Marcador encontrado:', marker.getLatLng()); // Para debug
                
                // Centrar el mapa en el marcador
                map.setView(marker.getLatLng(), 16, {
                    animate: true,
                    duration: 1
                });
                
                // Abrir el popup
                marker.openPopup();
            } else {
                console.log('No se encontró el marcador para:', deviceName); // Para debug
            }
        }
    });

    // Agregar el evento para colapsar/expandir
    toggleSidebarBtn.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        // Forzar al mapa a actualizarse
        map.invalidateSize();
    });
}); 
