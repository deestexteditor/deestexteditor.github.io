// Constants
const log = top.console.log;

// G-API
const API_KEY   = "AIzaSyCpVy-FZZurgg5qxNttSbUEE_2FYiNSh9s";
const CLIENT_ID = "946994473664-pu8mk7s22fv96d0cp0tf95givlbn5qic.apps.googleusercontent.com";
const SCOPES    = "https://www.googleapis.com/auth/drive.metadata.readonly\x20"+
                  "https://www.googleapis.com/auth/drive.file\x20"+
                  "https://www.googleapis.com/auth/drive.install";
const DISC_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];

// Vars
var Auth_Btn = null;
var Editor   = null;
var Gstate   = null; // Param 'state' in URL sent by Gdrive

// Shorthand for document.querySelector
function d$(Sel){
    return document.querySelector(Sel);
}

// Shorthand for document.querySelectorAll
function d$$(Sel){
    return document.querySelectorAll(Sel);
}

// Common functions
function new_lock(){
    var Unlock,Lock = new Promise((Res,Rej)=>{ Unlock=Res; });
    return [Lock,Unlock];
}

// Upload to Gdrive
// See: https://developers.google.com/drive/api/v3/reference/files/create
// See: https://tanaikech.github.io/2018/08/13/upload-files-to-google-drive-using-javascript
async function create_file_in_gdrive(Folder_Id,Binobj,Type){
    var Name = (new Date()).toISOString().replace("T","\x20").replace(/:/g,"-").
                                          replace(".","-").replace("Z","\x20GMT");

    if (Type=="text")
        var File_Name = Name+".txt";
    else
        var File_Name = Name;

    var Metadata = {
        "name":     File_Name,   // Filename at Google Drive
        "mimeType": "image",     // mimeType at Google Drive
        "parents":  [Folder_Id], // Folder ID at Google Drive
    };

    // Here gapi is used for retrieving the access token.
    var Access_Token = gapi.auth.getToken().access_token;
    var Form         = new FormData();
    Form.append("metadata", new Blob([JSON.stringify(Metadata)], {type: 'application/json'}));
    Form.append("file",     Binobj);

    // Make request to Gdrive
    var [Lock,Unlock] = new_lock();
    var File_Id       = null;
    var Xhr           = new XMLHttpRequest();

    // Gdrive to return id as indicated in 'fields=id'
    Xhr.open(
        "post",
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id"
    );
    Xhr.setRequestHeader("Authorization", "Bearer "+Access_Token);
    Xhr.responseType = "json";
    Xhr.onload = ()=>{
        log("[TM Gdrive] Gdrive file id:",Xhr.response.id); // Retrieve uploaded file ID.
        File_Id = Xhr.response.id;

        if (File_Id==null)
            alert("Failed to upload to Gdrive!");

        Unlock();
    };
    Xhr.send(Form);

    // Wait to get resulting file id
    await Lock;
    return File_Id;
}

// G DRIVE API ----------------------------------------
// See: https://developers.google.com/drive/api/v3/quickstart/js
function init_client() {
    gapi.client.init({
        apiKey:        API_KEY,
        clientId:      CLIENT_ID,
        discoveryDocs: DISC_DOCS,
        scope:         SCOPES
    }).
    then(
    function(){
        log("[Dad's TE] gapi initialised!");

        // Listen for sign-in state changes.
        gapi.auth2.getAuthInstance().isSignedIn.listen(update_signin_status);

        // Handle the initial sign-in state.
        update_signin_status(gapi.auth2.getAuthInstance().isSignedIn.get());
        Auth_Btn.onclick = handle_auth_click;
    },
    function(Err) {
        log("[Dad's TE] Failed to init gapi, err:",Err);
    });
}

/*!
 * Called when the signed in status changes, to update the UI
 * appropriately. After a sign-in, the API is called.
 */
function update_signin_status(signed_in) {
    if (signed_in) {
        Auth_Btn.innerHTML = "Auth'ed";
        Auth_Btn.setAttribute("authed","yes");
    }
    else {
        Auth_Btn.innerHTML = "Auth";
        Auth_Btn.setAttribute("authed","no");
    }
}

/*!
 * Sign in the user upon button click.
 */
function handle_auth_click(Event) {
    if (Auth_Btn.getAttribute("authed")!="yes")
        gapi.auth2.getAuthInstance().signIn();
    else
        gapi.auth2.getAuthInstance().signOut();
}

// G-API onload
function handle_gapi_load(){
    // Create UI
    top.document.querySelector("body").insertAdjacentHTML("beforeend",
    `<button id="Auth-Btn" style="position:fixed !important; left:1.5rem; top:1.5rem;
    cursor:pointer; height:1.5rem;">Auth</button>`);
    Auth_Btn = top.document.getElementById("Auth-Btn");

    // G-API init
    gapi.load("client:auth2",init_client);
}

// Create edit area
function create_edit_area(){
    var Area = d$("#Edit-Area");
  
    Editor = CodeMirror.fromTextArea(Area,{ 
        lineNumbers: true
    });
}

// Set content
function set_content(Content){
    return Editor.setValue(Content);
}

// Get content
function get_content(){
    return Editor.getValue();
}

// Get state sent by Gdrive
function get_state_in_url(){
    var Params = new URLSearchParams(top.location.search);
    var State  = Params.get("state");
  
    if (State==null)
        return {};
    
    try {
        return JSON.parse(State);
    }
    catch (Err){
        return {};
    }
}

// Check gdrive action
function check_gdrive_action(){
    Gstate = get_state_in_url();
    log("[Dad's TE] State from Gdrive:",Gstate);
    
    if (Gstate==null || Object.keys(Gstate).length==0){
        alert("This web app only works in integration with Gdrive!");
        return;
    }
    
    // Check action
    if (Gstate.action=="create"){
        set_content("New file, enter contents here...");
        return;
    }
}

// Wait for gapi and start, not necessary but just in case gapi is loaded with async
function wait_and_start(){
    var check_gapi = function(){
        if (typeof(gapi)=="undefined" || gapi==null){
            setTimeout(check_gapi,100);
            return;
        }

        handle_gapi_load();
        create_edit_area();
        check_gdrive_action();
    };
    setTimeout(check_gapi,100);
}

// APP ENTRY POINT ========================================
(function main() {
    wait_and_start();
})();
// EOF
