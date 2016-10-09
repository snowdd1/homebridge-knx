/* Wie sollen die Nutzer eigene Module für eigene Module einhängen 
 * 
 */

class GiraJalousieActuator {
	constructor(knxAPI) {
		this.myAPI=knxAPI;
	}
	
	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, newValue) {
		if (field==="TargetPosition") {
			// TargetPosition is DPT5.001 Percentage (0..255)
			// need to convert to (0..100) first
			// Homekit is using %-open, meaning 0% is closed/down
			
			newValue = 100 - newValue*100/255;
			
			if (newValue>this.myAPI.getValue("CurrentPosition")) {
				// newValue is higher, shutter's moving up
				this.myAPI.setValue("PositionState", 0); //up
			} else if (newValue<this.myAPI.getValue("CurrentPosition")){
				// newValue is higher, shutter's moving down
				this.myAPI.setValue("PositionState", 1); //down
			}
			this.myAPI.setValue("TargetPosition", newValue);
		} else if (field==="CurrentPosition") {
			// Current Position is sent by the actuator if the Movement has stopped a new postion is reached
			this.myAPI.setValue("PositionState", 2); //stopped
			
			// CurrentPosition is DPT5.001 Percentage (0..255)
			// need to convert to (0..100) first
			// Homekit is using %-open, meaning 0% is closed/down
			
			newValue = 100 - newValue*100/255;
			
			this.myAPI.setValue("CurrentPosition", newValue); // inform homekit
			
		} else if (field==="ShutterMove") {
			// this isn't a characteristic, we need this extra object to catch switch use, too
			// The actuator is lowering the rolling shutters if a 1 is received, and 
			// raises on a 0
			switch (newValue) {
			case 0:
				this.myAPI.setValue("PositionState", 0); //up
				break;
			case 1:
				this.myAPI.setValue("PositionState", 1); //down
				break;
			} // switch
		} //if
	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		// homekit will only send a TargetPosition value, so we do not care about (non-) potential others
		if (field==="TargetPosition") {
			newValue = (100-newValue*255/100);
			this.myAPI.KNXWrite(newValue, "DPT5"); // send the new position to the KNX bus
			// update the PositionState characteristic:			
			if (newValue>this.myAPI.getValue("CurrentPosition")) {
				// newValue is higher, shutter's moving up
				this.myAPI.setValue("PositionState", 0); //up
			} else if (newValue<this.myAPI.getValue("CurrentPosition")){
				// newValue is higher, shutter's moving down
				this.myAPI.setValue("PositionState", 1); //down
			}
			
		}
		
	} // onHKValueChange
} // class	
	
	
/*****************************************************************************************************
Passende Konfig dafür:


			"Services": [ 
				{ 
					"ServiceType": "WindowCovering",
					"Handler": "GiraJalousieAktor", 
					"ServiceName": "Rolling Shutter", 
					"Characteristics": [ 
						"TargetPosition": {
							"Set": "1/2/3",
							"Listen": "1/2/4"
						},
						"CurrentPosition": {
							"Set": "1/3/1",
							"Listen": "1/3/2"
						},
						"PositionState": "COMPUTED"
					],
					"KNX-Objects": [
						"ShutterMove": {
							"Listen": "1/2/1"
						}
					],
					"KNX-ReadRequests": [
						"1/2/4",
						"1/3/2"
					]
				 }
			 ]

Position State kennt mehrere Zustände
PositionState: DPT5.005 value [listen only: 0 Increasing, 1 Decreasing, 2 Stopped] 

*/
