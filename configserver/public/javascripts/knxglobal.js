/**
 * http://usejsdoc.org/
 */
// Userlist data array for filling in info box
var serviceListData = [];

// DOM Ready =============================================================
$(document).ready(function() {

    // Populate the user table on initial page load
	populateServicesTable();
    // Username link click
    //$('#userList table tbody').on('click', 'td a.linkshowservice', showUserInfo);
    // Add User button click
    //$('#btnAddUser').on('click', addUser);
    // Delete User link click
    //$('#userList table tbody').on('click', 'td a.removeservice', deleteUser);

});

// Functions =============================================================

// Fill table with data
function populateServicesTable() {

    // Empty content string
    var tableContent = '';

    // jQuery AJAX call for JSON
    $.getJSON( '/devices/services/' + ($('#uuid').val() ? $('#uuid').val() : $('#devicename').val()), function( data ) {
        // Stick our user data array into a userlist variable in the global object
    	serviceListData = data;
    	deviceUUID = ($('#uuid').val() ? $('#uuid').val() : $('#devicename').val())
        // For each item in our JSON, add a table row and cells to the content string
        $.each(data, function(){
            tableContent += '<tr>';
            tableContent += '<td><a href="/device/' + encodeURIComponent(deviceUUID) + '/' + encodeURIComponent(this.ServiceName) + '" class="linkshowservice" rel="' + this.ServiceType + '">' + this.ServiceType + '</a></td>';
            tableContent += '<td class="serviceName">' + this.ServiceName + '</td>';
            tableContent += '<td align="right"><a href="#" class="removeservice" rel="' + this.username + '">delete</a></td>'; // username as delete key for node-persist
            tableContent += '</tr>';
            if (this.Description){
                tableContent += '<tr>';
                tableContent += '<td colspan=3 class="serviceListDescription">' + this.Description + '</td>';
                tableContent += '</tr>';
            }
        });

        // Inject the whole content string into our existing HTML table
        $('#serviceList table tbody').html(tableContent);
    });
};

// go to next device [draft only]
function nextDevice() {
	$.getJSON('/devices/deviceinfos/'+document.getElementById("nextDevice"), function (data) {
		nextDeviceData = $.parseJSON(data);
		// update the web form
		
	});
}

//Show User Info
function showUserInfo(event) {

 // Prevent Link from Firing
 event.preventDefault();

 // Retrieve username from link rel attribute
 var thisUserName = $(this).attr('rel');

 // Get Index of object based on id value
 var arrayPosition = userListData.map(function(arrayItem) { return arrayItem.username; }).indexOf(thisUserName);

 // Get our User Object
 var thisUserObject = userListData[arrayPosition];

 //Populate Info Box
 $('#userInfoName').text(thisUserObject.fullname);
 $('#userInfoAge').text(thisUserObject.age);
 $('#userInfoGender').text(thisUserObject.gender);
 $('#userInfoLocation').text(thisUserObject.location); 
};

//Add User
function addUser(event) {
    event.preventDefault();

    // Super basic validation - increase errorCount variable if any fields are blank
    var errorCount = 0;
    $('#addUser input').each(function(index, val) {
        if($(this).val() === '') { errorCount++; }
    });

    // Check and make sure errorCount's still at zero
    if(errorCount === 0) {

        // If it is, compile all user info into one object
        var newUser = {
            'username': $('#addUser fieldset input#inputUserName').val(),
            'email': $('#addUser fieldset input#inputUserEmail').val(),
            'fullname': $('#addUser fieldset input#inputUserFullname').val(),
            'age': $('#addUser fieldset input#inputUserAge').val(),
            'location': $('#addUser fieldset input#inputUserLocation').val(),
            'gender': $('#addUser fieldset input#inputUserGender').val()
        }

        // Use AJAX to post the object to our adduser service
        $.ajax({
            type: 'POST',
            data: newUser,
            url: '/users/adduser',
            dataType: 'JSON'
        }).done(function( response ) {

            // Check for successful (blank) response
            if (response.msg === '') {

                // Clear the form inputs
                $('#addUser fieldset input').val('');

                // Update the table
                populateServicesTable();

            }
            else {

                // If something goes wrong, alert the error message that our service returned
                alert('Error: ' + response.msg);

            }
        });
    }
    else {
        // If errorCount is more than 0, error out
        alert('Please fill in all fields');
        return false;
    }
};


//Delete User
function deleteUser(event) {

 event.preventDefault();

 // Pop up a confirmation dialog
 var confirmation = confirm('Are you sure you want to delete this user?');

 // Check and make sure the user confirmed
 if (confirmation === true) {

     // If they did, do our delete
     $.ajax({
         type: 'DELETE',
         url: '/users/deleteuser/' + $(this).attr('rel')
     }).done(function( response ) {

         // Check for a successful (blank) response
         if (response.msg === '') {
         }
         else {
             alert('Error: ' + response.msg);
         }

         // Update the table
         populateServicesTable();

     });

 }
 else {

     // If they said no to the confirm, do nothing
     return false;

 }

};

