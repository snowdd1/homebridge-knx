/* jshint esversion: 6, strict: true, node: true */
'use strict';
/**
 * 
 */
var serviceArray = function (globs) {
    var Service = globs.Service;
    var Characteristic = globs.Characteristic;
    var debug = console.log;
    //iterateS(Service);
    //
    //create an array of dummy services to get the default parameters

    var availableServices = {
        Services: {},
        count: 0
    }; // object better than numbered array
    var serviceDummyName;
    var servData = {};
    var cService;
    for (serviceDummyName in Service) {
        if (serviceDummyName !== 'super_' && typeof Service[serviceDummyName] === 'function') {
            //if it has an UUID field, it's a service constructor, and it's not AccessoryInformation/BTLE:
            if (Service[serviceDummyName].UUID &&
                Service[serviceDummyName].UUID !== '0000003E-0000-1000-8000-0026BB765291' && // AccessoryInformation
                Service[serviceDummyName].UUID !== '00000056-0000-1000-8000-0026BB765291' //BTLE Bridge

            ) {
                //debug('Create Service ' + serviceDummyName);
                cService = new Service[serviceDummyName](serviceDummyName);
                availableServices.Services[serviceDummyName] = cService;
                availableServices.count++;
                // data for the drop down list for "new Service"
                servData[serviceDummyName] = {  // use the unique displayName of Service Type as ID
                    displayName: cService.displayName,
                    UUID: cService.UUID,
                    // TODO: localization file support
                    localized: {
                        en: {
                            displayName: cService.displayName
                        },
                        de: {
                            displayName: cService.displayName + ' (de)'
                        }
                    }
                };
            }
        }
    }

    var availableCharacteristics = {
        Char: {},
        count: 0
    };
    var charDummyName;
    var charData = {};
    var cCharacteristic;
    for (charDummyName in Characteristic) {
        if (charDummyName !== 'super_' && typeof Characteristic[charDummyName] === 'function') {
            //if it has an UUID field, it's a characteristics constructor
            if (Characteristic[charDummyName].UUID) {
                //debug('create Characteristic ' + charDummyName);
                cCharacteristic = new Characteristic[charDummyName]();
                availableCharacteristics[charDummyName] = cCharacteristic; // charDummyName is the name of the Object, not the displayName

                // data for the characteristics list display
                charData[cCharacteristic.displayName] = {  // use the unique displayName of Characteristic Type as ID, as the Object name is lost in the Services!
                    displayName: cCharacteristic.displayName,
                    objectName: charDummyName, // Back ref, if the characteristics have to be instantiated somewhere with characteristic[objectName]
                    UUID: cCharacteristic.UUID,
                    // TODO: localization file support
                    // now -just add language hint for debugging
                    localized: {
                        en: {
                            displayName: cCharacteristic.displayName + ' (en)'
                        },
                        de: {
                            displayName: cCharacteristic.displayName + ' (de)'
                        }
                    }
                };
            }
        }
    }

    return {
        availableServices: availableServices,
        availableCharacteristics: availableCharacteristics,
        servData: servData,
        charData: charData
    };

};
module.exports = serviceArray;
