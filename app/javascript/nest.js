/**
 *  Based on Copyright 2014 Nest Labs Inc. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
/* globals Firebase */
'use strict';


var nestToken  = window.readCookie('nest_token'),
    thermostat = {},
    structure  = {};

if (nestToken) { // Simple check for token

  // Create a reference to the API using the provided token
  var dataRef = new Firebase('wss://developer-api.nest.com');
  dataRef.auth(nestToken);

  // in a production client we would want to
  // handle auth errors here.

} else {
  // No auth token, go get one
  window.location.replace('/auth/nest');
}

function adjustTemperature(degrees) {
  var scale = getScale();
  var type = getMode() !== 'heat-cool' ? '': (degrees < 0 ? 'cool' : 'heat');
  var newTemp = thermostat['target_temperature_' + scale.toLowerCase()] + degrees,
      path = 'devices/thermostats/' + thermostat.device_id + '/target_temperature_' + type + scale.toLowerCase();

  if (thermostat.is_using_emergency_heat) {
    console.error("Can't adjust target temperature while using emergency heat.");
  } else if (thermostat.hvac_mode === 'heat-cool' && !type) {
    console.error("Can't adjust target temperature while in Heat • Cool mode, use target_temperature_high/low instead.");
  } else if (type && thermostat.hvac_mode !== 'heat-cool') {
    console.error("Can't adjust target temperature " + type + " while in " + thermostat.hvac_mode +  " mode, use target_temperature instead.");
  } else if (structure.away.indexOf('away') > -1) {
    console.error("Can't adjust target temperature while structure is set to Away or Auto-away.");
  } else { // ok to set target temperature
    dataRef.child(path).set(newTemp);
  }
}

function incrementTemperature() {
  var amount = getScale() == 'C' ? 0.5 : 1;
  adjustTemperature(amount);
}

function decrementTemperature() {
  var amount = getScale() == 'C' ? -0.5 : -1;
  adjustTemperature(amount);
}

function firstChild(object) {
  for(var key in object) {
    return object[key];
  }
}

/* Accessors */
function getScale() {
  return thermostat.temperature_scale;
}

function getHasLeaf() {
  return thermostat.has_leaf;
}

function getTemperature() {
  return thermostat['ambient_temperature_' + getScale().toLowerCase()];
}

function getMode() {
  return thermostat.hvac_mode;
}

function getTargetTemperature() {
  return thermostat['target_temperature_' + getScale().toLowerCase()];
}

function getThermostatName() {
  return thermostat['name'];
}

/**
  Start listening for changes on this account,
  update appropriate views as data changes.
 */
dataRef.on('value', function (snapshot) {
  var data = snapshot.val();

  // For simplicity, we only care about the first
  // thermostat in the first structure
  structure = firstChild(data.structures),
  thermostat = data.devices.thermostats[structure.thermostats[0]];

  // TAH-361, device_id does not match the device's path ID
  thermostat.device_id = structure.thermostats[0];

  window.dispatchEvent(new Event('api-update'));
});
