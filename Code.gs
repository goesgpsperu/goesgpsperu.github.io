function doGet(e) {
  try {
    const callback = e.parameter.callback || 'callback_default';
    Logger.log('Iniciando solicitud con callback: ' + callback);
    
    const result = getVehiclesData();
    Logger.log('Datos obtenidos: ' + JSON.stringify(result));
    
    const output = `${callback}(${JSON.stringify(result)})`;
    return ContentService.createTextOutput(output)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
      
  } catch (error) {
    Logger.log('Error en doGet: ' + error.toString());
    return ContentService.createTextOutput(`${callback}({"error": "${error.toString()}"})`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

function testSheetAccess() {
  try {
    const sheet = SpreadsheetApp.openById('1_I0rZ-b4UMMutaa9WfvpmKhkAT_d3jOPYYdaAy3rv7o');
    Logger.log('Nombre de la hoja: ' + sheet.getName());
    const bdSheet = sheet.getSheetByName('bd');
    Logger.log('Datos en la hoja:');
    const data = bdSheet.getDataRange().getValues();
    Logger.log(JSON.stringify(data));
    return 'Acceso exitoso';
  } catch (error) {
    Logger.log('Error accediendo a la hoja: ' + error.toString());
    return 'Error: ' + error.toString();
  }
}

function getVehiclesData() {
  try {
    Logger.log('Iniciando getVehiclesData');
    const sheet = SpreadsheetApp.openById('1_I0rZ-b4UMMutaa9WfvpmKhkAT_d3jOPYYdaAy3rv7o');
    Logger.log('Hoja encontrada');
    const bdSheet = sheet.getSheetByName('bd');
    Logger.log('Hoja bd encontrada');
    const data = bdSheet.getDataRange().getValues();
    Logger.log('Datos crudos: ' + JSON.stringify(data));
    
    // Omitir la primera fila (encabezados) y mapear los datos
    const vehicles = data.slice(1).map(row => {
      Logger.log('Procesando fila: ' + JSON.stringify(row));
      return {
        unidad: row[0],
        posInicial: row[1].toString().replace(/\s+/g, ''),
        posFinal: row[2].toString().replace(/\s+/g, ''),
        popup: row[3]
      };
    }).filter(vehicle => vehicle.unidad);
    
    Logger.log('Vehículos procesados: ' + JSON.stringify(vehicles));
    return vehicles;
  } catch (error) {
    Logger.log('Error en getVehiclesData: ' + error.toString());
    throw error;
  }
} 