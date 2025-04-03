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

        // Opcional: Agregar separadores visuales
        if (onlineVehicles.length > 0 && offlineVehicles.length > 0) {
            const devices = deviceList.querySelector('h2');
            const separator = document.createElement('div');
            separator.className = 'device-separator';
            separator.innerHTML = `
                <span class="separator-text">Dispositivos sin ubicación</span>
            `;
            // Insertar el separador después del último dispositivo online
            const onlineDevices = document.querySelectorAll('.device');
            onlineDevices[onlineVehicles.length - 1].after(separator);
        }
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
        const steps = 1000;
        const stepDelay = 3000; // Reducido a 3 segundos entre pasos
        let currentStep = 0;
        let routePoints = [];

        // Obtener la ruta usando OSRM con preferencia por calles principales
        fetch(`https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=false&continue_straight=true&preference=fastest`)
            .then(response => response.json())
            .then(data => {
                if (data.routes && data.routes[0]) {
                    routePoints = data.routes[0].geometry.coordinates.map(coord => ({
                        lng: coord[0],
                        lat: coord[1]
                    }));
                    
                    // Dibujar la ruta en el mapa
                    const routeLine = L.polyline(routePoints.map(p => [p.lat, p.lng]), {
                        color: '#ff7f50',
                        opacity: 0.6,
                        weight: 3,
                        smoothFactor: 1
                    }).addTo(map);

                    function step() {
                        if (currentStep >= steps) {
                            routeLine.remove(); // Limpiar la línea cuando termina
                            return;
                        }
                        
                        currentStep++;
                        const progress = currentStep / steps;
                        
                        // Encontrar el punto más cercano en la ruta
                        const routeIndex = Math.floor(progress * (routePoints.length - 1));
                        const currentPos = routePoints[routeIndex];
                        
                        // Calcular la rotación del marcador basado en la dirección del movimiento
                        if (routeIndex < routePoints.length - 1) {
                            const nextPos = routePoints[routeIndex + 1];
                            const angle = Math.atan2(nextPos.lat - currentPos.lat, nextPos.lng - currentPos.lng) * 180 / Math.PI;
                            marker.setRotationAngle(angle + 90);
                        }
                        
                        marker.setLatLng([currentPos.lat, currentPos.lng]);
                        marker.bindPopup(createCustomPopup(deviceName, popupText, currentPos));
                        
                        setTimeout(() => step(), stepDelay);
                    }

                    step();
                }
            })
            .catch(error => {
                console.error('Error obteniendo la ruta:', error);
                // Fallback mejorado
                const directLine = L.polyline([[start.lat, start.lng], [end.lat, end.lng]], {
                    color: '#ff7f50',
                    opacity: 0.6,
                    weight: 3,
                    dashArray: '10, 10' // Línea punteada para indicar ruta directa
                }).addTo(map);

                function fallbackStep() {
                    if (currentStep >= steps) {
                        directLine.remove();
                        return;
                    }
                    
                    currentStep++;
                    const progress = currentStep / steps;
                    
                    const newLat = start.lat + (end.lat - start.lat) * progress;
                    const newLng = start.lng + (end.lng - start.lng) * progress;
                    const currentPos = { lat: newLat, lng: newLng };
                    
                    marker.setLatLng([newLat, newLng]);
                    marker.bindPopup(createCustomPopup(deviceName, popupText, currentPos));
                    
                    setTimeout(() => fallbackStep(), stepDelay);
                }
                
                fallbackStep();
            });
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
