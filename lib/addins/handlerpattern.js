/* Wie sollen die Nutzer eigene Module für eigene Module einhängen 
 * 
 */

/**
 * @classdesc HandlerPattern is the prototype for all custom event handlers
 */
class HandlerPattern {
	
	/**
	 * Creates a HandlerPattern custom event handler object
	 * @param {API} knxAPI - the API instance for this handler
	 */
	constructor(knxAPI) {
		this.myAPI=knxAPI;
	}
	
	/****
	 * onKNXValueChange is invoked if a Bus value for one of the bound addresses is received
	 * 
	 */
	onKNXValueChange(field, oldValue, newValue) {
		throw new Error('IMPLEMENTATION MISSING.');
	} // onBusValueChange
	
	/****
	 * onHKValueChange is invoked if HomeKit is changing characteristic values
	 * 
	 */
	onHKValueChange(field, oldValue, newValue) {
		throw new Error('IMPLEMENTATION MISSING.');
		
	} // onHKValueChange
} // class	
	
module.exports = HandlerPattern;	
/*****************************************************************************************************
Config example


			"Services": [ 
				{ 
					"ServiceType": "WindowCovering",
					"Handler": "GiraJalousieAktor", 
					"ServiceName": "Rolling Shutter", 
					"Characteristics": [ 
						"TargetPosition": {
							"Set": "1/2/3",
							"Listen": "1/2/4",
							"DPT":"DPT5.001"
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
					],
					"LocalConstants": [
						"SomeVariable_notUsedHere": "SomeValue",
						"OtherBlinds_notUsedHere": "OfficeShutter"
					]
				 }
			 ]



*/
