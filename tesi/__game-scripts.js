// PlayerMovement.js
var PlayerMovement = pc.createScript('playerMovement');

PlayerMovement.attributes.add('speed', { type: 'number', default: 0.09 });

PlayerMovement.prototype.initialize = function () {
    var app = this.app;
    var camera = app.root.findByName('Camera');
    this.cameraScript = camera.script.cameraMovement;    
};


// Temp variable to avoid garbarge colleciton
PlayerMovement.worldDirection = new pc.Vec3();
PlayerMovement.tempDirection = new pc.Vec3();

PlayerMovement.prototype.update = function (dt) {
    var app = this.app;
    var worldDirection = PlayerMovement.worldDirection;
    worldDirection.set(0, 0, 0);
    
    var tempDirection = PlayerMovement.tempDirection;
    
    var forward = this.entity.forward;
    var right = this.entity.right;

    var x = 0;
    var z = 0; 
    
    if (app.keyboard.isPressed(pc.KEY_A)) {
        x -= 1;
    }

    if (app.keyboard.isPressed(pc.KEY_D)) {
        x += 1;
    }

    if (app.keyboard.isPressed(pc.KEY_W)) {
        z += 1;
    }

    if (app.keyboard.isPressed(pc.KEY_S)) {
        z -= 1;
    }

    if (x !== 0 || z !== 0) {
        worldDirection.add(tempDirection.copy(forward).mulScalar(z));
        worldDirection.add(tempDirection.copy(right).mulScalar(x));        
        worldDirection.normalize();
        
        var pos = new pc.Vec3(worldDirection.x * dt, 0, worldDirection.z * dt);
        pos.normalize().scale(this.speed);
        pos.add(this.entity.getPosition());

        var targetY = this.cameraScript.eulers.x + 180;
        var rot = new pc.Vec3(0, targetY, 0);

        this.entity.rigidbody.teleport(pos, rot);
    }
    
    this.entity.anim.setFloat('xDirection', x);
    this.entity.anim.setFloat('zDirection', z);
};


// CameraMovement.js
var CameraMovement = pc.createScript('cameraMovement');

CameraMovement.attributes.add('mouseSpeed', { type: 'number', default: 1.4, description: 'Mouse Sensitivity' });

// Called once after all resources are loaded and before the first update
CameraMovement.prototype.initialize = function () {
    this.eulers = new pc.Vec3();
    this.touchCoords = new pc.Vec2();

    var app = this.app;
    app.mouse.on("mousemove", this.onMouseMove, this);
    app.mouse.on("mousedown", this.onMouseDown, this);

    this.rayEnd = app.root.findByName('RaycastEndPoint');
    
    this.on('destroy', function() {
        app.mouse.off("mousemove", this.onMouseMove, this);
        app.mouse.off("mousedown", this.onMouseDown, this);
    }, this);
};
    
CameraMovement.prototype.postUpdate = function (dt) {
    var originEntity = this.entity.parent;
    
    var targetY = this.eulers.x + 180;
    var targetX = this.eulers.y;

    var targetAng = new pc.Vec3(-targetX, targetY, 0);
    
    originEntity.setEulerAngles(targetAng);
                   
    this.entity.setPosition(this.getWorldPoint());
    
    this.entity.lookAt(originEntity.getPosition());
};

CameraMovement.prototype.onMouseMove = function (e) {
    if (pc.Mouse.isPointerLocked()) {
        this.eulers.x -= ((this.mouseSpeed * e.dx) / 60) % 360;
        this.eulers.y += ((this.mouseSpeed * e.dy) / 60) % 360;

        if (this.eulers.x < 0) this.eulers.x += 360;
        if (this.eulers.y < 0) this.eulers.y += 360;
    }
};

CameraMovement.prototype.onMouseDown = function (e) {
    this.app.mouse.enablePointerLock();
};

CameraMovement.prototype.getWorldPoint = function () {
    var from = this.entity.parent.getPosition(); 
    var to = this.rayEnd.getPosition();

    var hitPoint = to;

    var app = this.app;
    var hit = app.systems.rigidbody.raycastFirst(from, to);
    
    return hit ? hit.point : to;
};


// bridgeController.js
var BridgeController = pc.createScript('bridgeController');

// initialize code called once per entity
BridgeController.prototype.initialize = function() {
    this.socket = io.connect('http://localhost:8590');
    this.socket.emit ('initialize');
    var socket = this.socket;

    socket.on ('obstacles', function (data) {
        console.log("obstacle", data.lon / (-3), 0, data.lat / 3 )
        //make appear an obstacle at the defined x and y coordinates and make it disappear after 2 seconds
        var obstacle = new pc.Entity();
        obstacle.addComponent('model', {
            type: 'box'
        });
        obstacle.setLocalPosition(data.lon / (-3), 0, data.lat / 3);
        self.app.root.addChild(obstacle);
        setTimeout(() => {
            obstacle.destroy();
        }, 2000);
    });

    socket.on ('good', function (data) {
        console.log("good")
    });
    // Imposta l'intervallo per registrare la posizione ogni 5 secondi
    var self = this;
    var idApp3D= "ABCD";
    //const authCode= "e3f9"; //IDUSR: 12396 ABCD
    var authCode = "a254"; //IDUSR: 12397 ABCD 
    //var authCode = "7a96" //IDUSR: 12398 ABCD
    //AWS
    //var authCode = "4ab5"
    //var authCode = "4628"
    //var authCode = "8cc5"
    var token;
    let cycles = 0;
    var prev_pos = null;
    this.intervalID = setInterval(function() {
        /*
        const objs = self.app.root.findByTag("dynamic");
        
        let entities = [];

        objs.forEach((e)=>{
            entities.push({
                name: e.name,
                position: [e.getPosition().x, e.getPosition().y, e.getPosition().z],
                orientation: [e.getLocalEulerAngles().x, e.getLocalEulerAngles().y, e.getLocalEulerAngles().z],
                scale: [e.getScale().x, e.getScale().y, e.getScale().z]
            })

            //inviare le entities al bridge
            //prender il token
            //inviare la richiesta
            //finire
        })

        let identifiers = [];
        var now = new Date();
         // Formatta la data con millisecondi aggiuntivi in "yyyy-MM-ddTHH:mm:ss.ffffffZ"
        var formattedDate = now.toISOString().slice(0, -2) + "Z";

        entities.forEach((e)=>{
            identifiers.push({
                identifier: e.name,
                parameter: "position",
                value: e.position,
                timestamp: formattedDate
            });

            identifiers.push({
                identifier: e.name,
                parameter: "orientation",
                value: e.orientation,
                timestamp: formattedDate
            });

            identifiers.push({
                identifier: e.name,
                parameter: "scale",
                value: e.scale,
                timestamp: formattedDate
            });
        })


        pc.http.post("http://localhost:3030/3d-modules/getToken", JSON.stringify({idApp3D, authCode}), {"headers": {
            'Content-Type': 'application/json'
            }},
            function (err, response) {
                ////console.log(response);
                token = response.token;
                pc.http.post("http://localhost:3030/3d-modules/statements", JSON.stringify(identifiers), {"headers": {
                            'Content-Type': 'application/json',
                            "Authorization": "Bearer " + token
                    }},
                    function (err, response) {
                        if(err){
                            //console.log("ERR", err)
                        }
                        ////console.log(response);                    
                    }
                );
            }
        );
        */
        var pos = self.entity.getPosition();
        if(cycles === 0){
            prev_pos = { ...pos };
            //console.log("im here PREV POS", prev_pos.x, prev_pos.z);
        }

        //console.log("POS ", pos.x, pos.z);
        //console.log("PREV POS", prev_pos.x, prev_pos.z);
        var now = new Date();

        // Formatta la data con millisecondi aggiuntivi in "yyyy-MM-ddTHH:mm:ss.ffffffZ"
        var formattedDate = now.toISOString().slice(0, -2) + "Z";
        /*
        let obj = {
             "position": {
                "type": "Property",
                "value":  [
                        pos.x,
                        pos.y,
                        pos.z
                    ]
                ,
                "observedAt": formattedDate
            }
        }
        */
        //creo oggetto statements
        let playerStatement = [{
            identifier: "defaultplayer",
            parameter: "position",
            value: [
                        pos.x,
                        pos.y,
                        pos.z
                    ],
            prev_pos:[
                prev_pos.x,
                prev_pos.y,
                prev_pos.z
            ],
            timestamp: formattedDate
        }
        /*
            ,{
                identifier: "player",
                parameter: "_type",
                value: "Player",
                timestamp: formattedDate
            },{
                identifier: "player",
                parameter: "isContainedInObject",
                object: "scene",
                timestamp: formattedDate
            }
        */
        ]

        let gameoverStatement = [{
            identifier: "defaultplayer",
            parameter: "gameover",
            value: "session " + formattedDate,
            timestamp: formattedDate
        }
        ]
        
        var bridgeUrl = "http://127.0.0.1:9190/logs";
        //var bridgeUrl = "https://minervabridge.sferainnovazione.com";
        /*
        if(cycles === 10){
            //console.log("CYCLE")
            pc.http.post(bridgeUrl, JSON.stringify(gameoverStatement), {"headers": {
                        'Content-Type': 'application/json'
                }},
                function (err, response) {
                    if(err){
                        //console.log("ERR", err)
                    }
                    //console.log(JSON.stringify(gameoverStatement));                    
                }
            );
        }
        */
        pc.http.post(bridgeUrl, JSON.stringify(playerStatement), {"headers": {
                    'Content-Type': 'application/json'
            }},
            function (err, response) {
                if(err){
                    //console.log("ERR", err)
                }
                //console.log(JSON.stringify(playerStatement));                  
            }
        );
        console.log("pos",prev_pos.x * (-1), prev_pos.z  ,pos.x * (-1), pos.z )
        console.log("prevPos",prev_pos.x * (-3), prev_pos.z *3 ,pos.x * (-3), pos.z * 3)
        prev_pos = { ...pos };
        /*
        let green = entities.filter((e)=>e.name=="SferaVerde");
        let obj1 = {
             "position": {
                "type": "Property",
                "value":  [
                        green[0].position[0],
                        green[0].position[1],
                        green[0].position[2],
                    ]
                ,
                "observedAt": formattedDate
            }
        }

        pc.http.post("https://broker.minerva.sferainnovazione.com/ngsi-ld/v1/entities/minerva:19:USER-1:SCENA-TEST:SferaVerde/attrs", JSON.stringify(obj1), {"headers": {
            'Content-Type': 'application/json',
            'Link': '<https://uri.etsi.org/ngsi-ld/primer/store-context.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'
        }},
             function (err, response) {
                if(err){
                    //console.log("ERR", err)
                }
                ////console.log(response);    
            }
        );
        */
        cycles++;
    }, 850); // 1000 millisecondi = 1 secondo

    //inviare aggiornamenti di tutti gli elementi dynamic (esistono static e dynamic);
    //esempio: Le sfere si possono muovere, la capsula gialla no; è dunque utile inviare le posizioni delle sfere

};

// update code called every frame
BridgeController.prototype.update = function(dt) {
    // Questa funzione continua ad essere chiamata ad ogni frame
    // Puoi lasciarla vuota se non hai bisogno di aggiornamenti ad ogni frame
};

// cleanup code called when the script is removed
BridgeController.prototype.cleanup = function() {
    // Cancella l'intervallo quando lo script viene rimosso
    clearInterval(this.intervalID);
};
//deafultplayer
// swap method called for script hot-reloading
// inherit your script state here
// BridgeController.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// https://developer.playcanvas.com/en/user-manual/scripting/

// fireScorm.js
var FireScorm= pc.createScript('fireScorm');
// initialize code called once per entity
FireScorm.prototype.initialize = function () {
    var self = this;
    this.entity.collision.on('collisionstart', this.onCollisionStart, this);
    this.Entity1 = this.app.root.findByName('LandingPlatform');
    this.collide = false;
   /* this.idLms = "7",
    this.idUsr = "2503";
    this.idApp3d = "111111";
    this.authCode = "5878";
    this.bridgeURL = "http://localhost:3030";
    this.headers = {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZExtcyI6IjciLCJpZFVzciI6IjI1MDMiLCJhdXRoQ29kZSI6IjU4NzgiLCJpZEFwcDNkIjoiMTExMTExIiwiaWF0IjoxNjg2MzIyNjM1fQ.C2L1S1ssWARYyOrKGCIg2ufDkIE9H-QQrsYbk0YsRC4"
    };*/
    ////console.log(this.Entity1)
    //setInterval(function(){//console.log("POSIZIONE: ",self.entity.getLocalPosition())}, 500) //1000 = 1 secondo

};

FireScorm.prototype.onCollisionStart = async function (result) {
    //Check to see if Entity1 has hit this object
    
        this.collide = true;
        const saveD = {
            save_data:{
                score:30,
                minerva_data:{
                    position: this.entity.getLocalPosition(),
                    rotation: this.entity.getRotation()
                }
            }
        }
        //console.log(JSON.stringify(saveD.save_data.minerva_data.position))
        
        /*pc.http.post(this.bridgeURL+"/3d-modules/saveDatas", JSON.stringify(saveD), {"headers": this.headers},
             function (err, response) {
                //console.log(response);
            }
        );*/
        //console.log("you hit me!!");
};


BridgeController.prototype.update = function(dt) {
    // Questa funzione continua ad essere chiamata ad ogni frame
    // Puoi lasciarla vuota se non hai bisogno di aggiornamenti ad ogni frame
};
// swap method called for script hot-reloading
// inherit your script state here
// FireScorm.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// https://developer.playcanvas.com/en/user-manual/scripting/

// bridgeInterface.js
var BridgeInterface = pc.createScript('bridgeInterface');

// initialize code called once per entity
BridgeInterface.prototype.initialize = function() {
    const idApp3D= "ABCD";
    //const authCode= "e3f9"; //IDUSR: 12396 ABCD
    //var authCode = "a254"; //IDUSR: 12397 ABCD 
    var authCode = "7a96" //IDUSR: 12398 ABCD
    //AWS
    //var authCode = "4ab5"
    //var authCode = "4628"
    //var authCode = "8cc5"
    var token;
    //Inviare tutti gli oggetti figli della root
    //Mi aspetto:
    /**
     * Player
     * 3 Sfere
     * Pillola
     * terreno
     * cesta
     * freccia
    **/
    let objs = this.app.root.findByTag("serializable");
    let entities = [];
    let identifiers = [];

    let scene_3d = this.app.root.findByTag("3DScene"); 
    
    ////console.log(scene_3d);
    entities.push({
        name: scene_3d[0].name,
        length: scene_3d[0].getScale().x,
        height: scene_3d[0].getScale().y,
        width: scene_3d[0].getScale().z
    })

    var _now = new Date();
    // Formatta la data con millisecondi aggiuntivi in "yyyy-MM-ddTHH:mm:ss.ffffffZ"
    var _formattedDate = _now.toISOString().slice(0, -2) + "Z";

    scene_3d = entities.pop();

    identifiers.push({
        identifier: "scene",
        parameter: "height",
        value: scene_3d.height,
        timestamp: _formattedDate
    });

    identifiers.push({
        identifier: "scene",
        parameter: "width",
        value: scene_3d.width,
        timestamp: _formattedDate
    });

    identifiers.push({
        identifier: "scene",
        parameter: "length",
        value: scene_3d.length,
        timestamp: _formattedDate
    });

    identifiers.push({
        identifier: "scene",
        parameter: "name",
        value: scene_3d.name,
        timestamp: _formattedDate
    });

    identifiers.push({
        identifier: "scene",
        parameter: "_type",
        value: "3DScene",
        timestamp: _formattedDate
    });

    objs.forEach((e)=>{
        entities.push({
            name: e.name,
            position: [e.position.x, e.position.y, e.position.z],
            orientation: [e.getLocalEulerAngles().x, e.getLocalEulerAngles().y, e.getLocalEulerAngles().z],
            scale: [e.getScale().x, e.getScale().y, e.getScale().z]
        })
        ////console.log(e);
    })

    entities.forEach((e)=>{
        var now = new Date();
        // Formatta la data con millisecondi aggiuntivi in "yyyy-MM-ddTHH:mm:ss.ffffffZ"
        var formattedDate = now.toISOString().slice(0, -2) + "Z";
        identifiers.push({
            identifier: e.name,
            parameter: "position",
            value: e.position,
            timestamp: formattedDate
        });

        identifiers.push({
            identifier: e.name,
            parameter: "orientation",
            value: e.orientation,
            timestamp: formattedDate
        });

        identifiers.push({
            identifier: e.name,
            parameter: "scale",
            value: e.scale,
            timestamp: formattedDate
        });

        identifiers.push({
            identifier: e.name,
            parameter: "isContainedInObject",
            object: "scene",
            timestamp: formattedDate
        });
    })

    var now = new Date();
        // Formatta la data con millisecondi aggiuntivi in "yyyy-MM-ddTHH:mm:ss.ffffffZ"
        var formattedDate = now.toISOString().slice(0, -2) + "Z";
        identifiers.push({
            identifier: "defaultplayer",
            parameter: "position",
            value: [
                        0,
                        0,
                        0
                    ],
            timestamp: formattedDate
        });

        identifiers.push({
            identifier: "defaultplayer",
            parameter: "orientation",
            value: [0, 0, 0],
            timestamp: formattedDate
        });

        identifiers.push({
            identifier: "defaultplayer",
            parameter: "scale",
            value: [1,1,1],
            timestamp: formattedDate
        });

        identifiers.push({
            identifier: "defaultplayer",
            parameter: "isContainedInObject",
            object: "scene",
            timestamp: formattedDate
        });

        identifiers.push({
            identifier: "defaultplayer",
            parameter: "sessions",
            value: "session1",
            timestamp: formattedDate
        });

        identifiers.push({
            identifier: "defaultplayer",
            parameter: "_type",
            value: "Player",
            timestamp: formattedDate
        });

    
    var bridgeUrl = "http://127.0.0.1:9190/logs";
    //var bridgeUrl = "https://minervabridge.sferainnovazione.com";
    
    /*pc.http.post(bridgeUrl, JSON.stringify(identifiers), {"headers": {
                'Content-Type': 'application/json'
        }},
        function (err, response) {
            ////console.log(JSON.stringify(identifiers));                    
        }
    );*/
};

// update code called every frame
BridgeInterface.prototype.update = function(dt) {

};

// swap method called for script hot-reloading
// inherit your script state here
// BridgeInterface.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// https://developer.playcanvas.com/en/user-manual/scripting/

// serverScript.js


