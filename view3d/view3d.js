// view3d.js
// A 3D viewer for UK weather data from a modified WCS server.
// VERY EXPERIMENTAL. DATA COULD BE WRONG, UNAVAILABLE, ETC.
// MOST DEFINITELY NOT FOR OPERATIONAL USE!!
//
// Michael Saunby
//
//




var VIEW3D = {

    scene : null,
    camera : null,
    controls : null,
    renderer : null,
    container : null,
    //water : null,
    directionalLight : null,
    fps: 30,  // 30 is current Firefox max, as far as I can tell.
    // Chrome will go up to 60 which gets GPU hot.

    init_scene : function init_scene(){
    this.then = Date.now();
    this.now = null;
    this.delta = null;

	this.scene = new THREE.Scene();
	this.camera = new THREE.PerspectiveCamera(55.0, window.innerWidth / window.innerHeight, 0.5, 3000000);
	this.camera.position.set(130, 2000, 1300);
	this.camera.lookAt(new THREE.Vector3(0, 0, 0));

	this.renderer = new THREE.WebGLRenderer({alpha: true});
	this.renderer.setSize(window.innerWidth, window.innerHeight);
	this.renderer.setClearColor( 0x6666ff, 1);

	this.controls = new DeviceOrientationController( this.camera, this.renderer.domElement );
    this.controls.connect();
	this.controls.addEventListener( 'change', function(){VIEW3D.fps=30;});

	this.directionalLight = new THREE.DirectionalLight(0xffffdd, 1);
	//directionalLight.position.set(-600, 300, -600);
	this.directionalLight.position.set(200, 800, 1500);
	this.scene.add(this.directionalLight);

	/*
	var waterNormals = new THREE.ImageUtils.loadTexture('waternormals.jpg');
	waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

	this.water = new THREE.Water(this.renderer, this.camera, this.scene, {
		textureWidth: 256,
		textureHeight: 256,
		waterNormals: waterNormals,
		alpha:  1.0,
		sunDirection: this.directionalLight.position.normalize(),
		sunColor: 0xffffff,
		waterColor: 0x001e0f,
		betaVersion: 0,
		side: THREE.DoubleSide,
		noiseScale: 0.1
	    });
	var aMeshMirror = new THREE.Mesh(
					 new THREE.PlaneGeometry(2000, 2000, 100, 100),
					 this.water.material
					 );
	aMeshMirror.add(this.water);
  */

  // see http://www.html5rocks.com/en/tutorials/webgl/shaders/


  var uniforms1 = {
            time: { type: "f", value: 1.0 },
            resolution: { type: "v2", value: new THREE.Vector2() }
          };

  var attributes = {
              displacement: {
                  type: 'f', // a float
                  value: [] // an empty array
              }
  };
  /*
  var shader_material = new THREE.ShaderMaterial( {
              attributes: attributes,
              uniforms: uniforms1,
              vertexShader: document.getElementById( 'vertexShader1' ).textContent,
              fragmentShader: document.getElementById( 'fragment_shader0' ).textContent

              } );
	*/
  var shader_material = new THREE.MeshPhongMaterial({color: 0x444488});


  var aMeshMirror = new THREE.Mesh(
           new THREE.PlaneGeometry(2000, 2000, 100, 100), shader_material
           );
	aMeshMirror.rotation.x = - Math.PI * 0.5;

  aMeshMirror.castShadow = false;
  aMeshMirror.receiveShadow = true;

	/*
  var vertices = aMeshMirror.geometry.vertices;
  var values = attributes.displacement.value
  for(var v = 0; v < vertices.length; v++) {
                values.push(Math.random() * 30);
  }
	*/

	this.scene.add(aMeshMirror);

	this.container = new THREE.Object3D();
	this.scene.add(this.container);
    },


    display: function display() {
      //this.water.render();
      this.renderer.render(this.scene, this.camera);
      if(stats){
        stats.update();
      }
    },

    update: function update() {
      //this.water.material.uniforms.time.value += 1.0 / 60.0;
      this.now = Date.now();
      this.delta = this.now - this.then;
      this.then = this.now;
      if (this.controls.forwardMovement & !this.controls.backwardMovement) {
        VIEW3D.camera.translateZ(- this.delta * 0.1);
      }
      if (this.controls.backwardMovement & !this.controls.forwardMovement) {
        VIEW3D.camera.translateZ(+ this.delta * 0.1);
      }
      this.camera_position = VIEW3D.camera.position;
	    this.controls.update();
      this.display();
    },

    resize: function resize(inWidth, inHeight) {
      this.camera.aspect =  inWidth / inHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(inWidth, inHeight);
      this.canvas.html(this.renderer.domElement);
      this.display();
    }
};

VIEW3D.init_scene();

//function mainLoop() {
//    requestAnimationFrame(mainLoop);
//    VIEW3D.update();
//}

function mainLoop() {
    // Left to run at max speed I get almost 60fps on a Macbook Pro.
    // Which will cause the fan to come on and drain the battery.
    // The timeout sets the max frame rate.  1000/5 gives 5fps.
    // fps is increased when the controls are moved.  Gives a much
    // smoother experience.
    setTimeout( function() {
	    requestAnimationFrame(mainLoop);
	}, 1000 / VIEW3D.fps );

    if(VIEW3D.fps>30){VIEW3D.fps--;}
    VIEW3D.update();
}


angular.module('viewer', []).controller("MainController", function($scope, $http, $location){

	$scope.dem_width = 256;
	$scope.dem_height = 256;
	// Don't use huge numbers for width or height.  300x300 is just fine.
	// For a start, localStorage will fail with large data files as it's stored as text!!
	//
	// Issuing localStorage.clear() in console is useful too :-)

	$scope.position = null; // camera position

	// The OpenShift application allows cross origin requests (for now).
	$scope.demProviderUrl = "http://python-wetoffice.rhcloud.com/dembin";
	$scope.wxProviderUrl = "http://python-wetoffice.rhcloud.com/capbin";
	// To use your own (local) server for data replace with these -
	//$scope.demProviderUrl = "/dembin";
	//$scope.wxProviderUrl = "/capbin";

  $scope.cld_low = "../utils/cld_low.bin";
  $scope.cld_med = "../utils/cld_med.bin";
  $scope.cld_hig = "../utils/cld_hig.bin";


	//$scope.bboxes = {"UK":"-14,47.5,7,61", "Exeter":"-4.93266,49.31965,-2.12066,52.13165"};
  $scope.bboxes = {"UK":"-12,50,3.5,59", "Exeter":"-4.93266,49.31965,-2.12066,52.13165"};
	$scope.bboxChoice = $scope.bboxes["UK"]; // watched
	$scope.paletteColour0 =  "rgba(255,255,255,0)";
	$scope.paletteColour1 =  "rgba(255,255,255,0.8)";
	$scope.shininess = "90";

	$scope.wx_mult = 200;
	$scope.wx_add = 50;
	$scope.wx_mesh = null;

	$scope.dem_mesh = null;

	$scope.light_x = -1000;
	$scope.light_y = 1500;
	$scope.light_z = -900;

  $scope.camera_x = 0;
  $scope.camera_y = 2000;
  $scope.camera_z = 2000;


	$scope.demdata = null;
	$scope.rawdata = null;

	$scope.$watch('bboxChoice', function(){
		if($scope.wx_mesh){VIEW3D.container.remove( $scope.wx_mesh )};
		if($scope.dem_mesh){VIEW3D.container.remove( $scope.dem_mesh )};
		var params = angular.copy( $location.search());
		params.BBOX = $scope.bboxChoice;
		//console.log('PATH', $location.path());
		//console.log('SEARCH', params);
		$scope.getDEM( $location.path(), params );
		$scope.getCoverage( $location.path(), params );
	 });

   $scope.$watchGroup(['light_x','light_y','light_z'], function(){
 		VIEW3D.directionalLight.position.set(Number($scope.light_x), Number($scope.light_y), Number($scope.light_z));
 		//VIEW3D.water.sunDirection = VIEW3D.directionalLight.position.normalize();
 	});

   $scope.$watchGroup(['camera_x','camera_y','camera_z'], function(){
     VIEW3D.camera.position.set(Number($scope.camera_x), Number($scope.camera_y), Number($scope.camera_z));
   });

	$scope.getCameraPosition = function() {
	    $scope.position = VIEW3D.camera.position;
	}

	$scope.rebuildWx = function() {
	    //VIEW3D.container.remove( $scope.wx_mesh );
	    //$scope.buildWx( $scope.rawdata, $scope.dem_width, $scope.dem_height );
	}

	// If you'd rather not use the HTML5 canvas gradient trick, you can create
	// palettes like this.
	/*
	$scope.paletteFn = function( v ){
	    var rgba = {'r':0,'g':0,'b':0,'a':0};
	    if (v < 1 ){
		rgba.r = 15;
		rgba.g = 15;
		rgba.b = 255;
		rgba.a = 0;
	    }else{
		rgba.r = (v < 500) ? v/3 : 160;
		rgba.g = (rgba.r < 100) ? 200-rgba.r: 128;
		rgba.b = 0;
		rgba.a = 255;
	    }
	    return rgba;
	}
	*/

	$scope.DemPaletteFn = function() {
	    var canvas = document.createElement( 'canvas' );
	    canvas.width = 256;
	    canvas.height = 1;

	    var context = canvas.getContext( '2d' );
	    var grad = context.createLinearGradient(0,0,256,0);
	    grad.addColorStop(0, "#108010");
	    grad.addColorStop(.6, "#606010");
	    grad.addColorStop(1, "#906030");

	    context.fillStyle = grad;
	    context.fillRect(0, 0, 256, 1);

	    var palette = [], r, g, b, a;
	    var image = context.getImageData( 0, 0, canvas.width, 1 );
	    for ( var i = 0; i < image.data.length; i += 4 ) {
		r = image.data[ i ];
		g = image.data[ i + 1 ];
		b = image.data[ i + 2 ];
		a = image.data[ i + 3 ];
		palette.push({r:r,g:g,b:b,a:a});
	    }
	    var fn = function(v){
		v = ~~v;
		if(v < 1){
		    return {r:0,g:0,b:0,a:0};
		}else{
		    v = (v>255) ? 255 : v;
		    return palette[v];
		}
	    };
	    return fn;
	}

	$scope.generateTexture = function(data, dem_width, dem_height ) {
	    var palfn = $scope.DemPaletteFn();
	    var canvas = document.createElement( 'canvas' );
	    canvas.width = 600;
	    canvas.height = 600;

	    var context = canvas.getContext( '2d' );
	    var image = context.getImageData( 0, 0, canvas.width, canvas.height );

	    // N.B. image.data is a Uint8ClampedArray. See http://www.html5rocks.com/en/tutorials/webgl/typed_arrays/
	    var x = 0, y = 0, v;
	    for ( var i = 0, j = 0, l = image.data.length; i < l; i += 4, j ++ ) {
		x = j % canvas.width;
		y = x == 0 ? y + 1 : y;
		// ~~ faster that .toFixed(0)
		var xi = ~~(dem_width/canvas.width  * x);
		var yi = ~~(dem_height/canvas.height * y);
		v = data[(yi % dem_height )* dem_width + (xi % dem_width)];
		var rgba = palfn( v * 0.5 );
		image.data[i] = rgba.r;
		image.data[i+1] = rgba.g;
		image.data[i+2] = rgba.b;
		image.data[i+3] = rgba.a;
	    }
	    context.putImageData( image, 0, 0 );
	    return canvas;
	}

	$scope.WxPaletteFn = function() {
	    var canvas = document.createElement( 'canvas' );
	    canvas.width = 255;
	    canvas.height = 1;

	    var context = canvas.getContext( '2d' );
	    var grad = context.createLinearGradient(0,0,256,0);
	    grad.addColorStop(0, $scope.paletteColour0);
	    grad.addColorStop(1, $scope.paletteColour1);
	    context.fillStyle = grad;
	    context.fillRect(0, 0, 255, 1);

	    var palette = [{r:0,g:0,b:0,a:0}], r, g, b, a;
	    var image = context.getImageData( 0, 0, canvas.width, 1 );
	    for ( var i = 0; i < image.data.length; i += 4 ) {
		r = image.data[ i ];
		g = image.data[ i + 1 ];
		b = image.data[ i + 2 ];
		a = image.data[ i + 3 ];
		palette.push({r:r,g:g,b:b,a:a});
	    }
	    var fn = function(v){
		v = ~~v;
		v = v > 255 ? 255 : v;
		return palette[v];
	    };
	    return fn;
	}

	$scope.generateCloudTexture = function(data, width, height) {
	    var palfn = $scope.WxPaletteFn();
	    var canvas = document.createElement( 'canvas' );
	    canvas.width = 600;
	    canvas.height = 600;

	    var context = canvas.getContext( '2d' );
	    var image = context.getImageData( 0, 0, canvas.width, canvas.height);

	    // N.B. image.data is a Uint8ClampedArray. See http://www.html5rocks.com/en/tutorials/webgl/typed_arrays/
	    var x = 0, y = 0, v;
	    var w_ratio = width/canvas.width;
	    var h_ratio = height/canvas.height;
	    for ( var i = 0, j = 0, l = image.data.length; i < l; i += 4, j ++ ) {
		x = j % canvas.width;
		y = x == 0 ? y + 1 : y;
		// The ~~ operator removes decimal part of float. Much quicker than .toFixed(0)
		var xi = ~~(w_ratio  * x);
		var yi = ~~(h_ratio * y);
		v = data[(yi % height )* width + (xi % width)];
		var rgba = palfn( v * 255/100 );
		image.data[i] = rgba.r;
		image.data[i+1] = rgba.g;
		image.data[i+2] = rgba.b;
		image.data[i+3] = rgba.a;
	    }
	    context.putImageData( image, 0, 0 );
	    return canvas;
	}

	$scope.test = function( n ){
	    VIEW3D.controls.enabled = false;
	    console.log('test', n);
	    $scope.overlayStyle = {'z-index':-1};
	};

	$scope.controlsActive = function( enabled ){
	    VIEW3D.controls.enabled = enabled;
      $scope.position = VIEW3D.camera.position;
      $scope.camera_x = $scope.position.x;
      $scope.camera_y = $scope.position.y;
      $scope.camera_z = $scope.position.z;
      socket.emit('camera-pos', VIEW3D.camera.position);
      socket.emit('x', VIEW3D.camera.position.x);
      socket.emit('y', VIEW3D.camera.position.y);
      socket.emit('z', VIEW3D.camera.position.z);
      socket.emit('camera-ang', VIEW3D.camera.rotation);
	};

	$scope.defaultDEMParams = {
	    request: "GetCoverage",
	    crs: "EPSG:4326",
	    bbox: $scope.bboxChoice,
	    width: $scope.dem_width,
	    height: $scope.dem_height,
	    format: "AAIGrid_INT16"
	};
	$scope.defaultWxParams = {
	    REQUEST: "GetCoverage",
	    SERVICE: "WCS",
	    VERSION: "1.0",
	    CRS: "EPSG:4326",
	    BBOX: $scope.bboxChoice,
	    WIDTH: $scope.dem_width,
	    HEIGHT: $scope.dem_height,
	};

	$scope.distns = 0;
	$scope.distew = 0;

	$scope.location = $location;

	$scope.coverage = {};

	// Should we update the data selection, etc. if the search changes?
	// Probably, yes.
	$scope.$watch('location.search()', function(){
		//console.log('PATH', $location.path());
		//console.log('SEARCH',  $location.search());
		//$scope.getDEM( $location.path(), $location.search() );
		//$scope.getCoverage( $location.path(), $location.search() );
	    });


	$scope.buildLand = function( data ){
	    var texture = new THREE.Texture( $scope.generateTexture(data, $scope.dem_width, $scope.dem_height) );
	    texture.needsUpdate = true;
	    var material = new THREE.MeshPhongMaterial({
		    map: texture, transparent: true, specular: 0x444444, shininess: 10 });
	    // (tranparent = true) allows sea to be seen.  Perhaps sea level should be dropped.

	    var geometry = new THREE.PlaneGeometry(2000, 2000, $scope.dem_width-1, $scope.dem_height-1);
	    var scale_fac = 2000.0 /  ($scope.distns * 1000.0);
	    for(i = 0; i < data.length; i++){
		var ht = data[i];
		if(ht < 0){ht = 0;}
		geometry.vertices[i].z = (ht * 10.0 * scale_fac) + 5.0;
	    }

	    var mesh = new THREE.Mesh(geometry, material);
	    mesh.castShadow = false;
	    mesh.receiveShadow = true;
	    mesh.position.z = 0;
	    mesh.rotation.x = - Math.PI * 0.5;
	    $scope.dem_mesh = mesh;
	    VIEW3D.container.add(mesh);
	};


	$scope.buildWx = function( data, width, height, add, mult ){
	    var texture = new THREE.Texture( $scope.generateCloudTexture(data, width, height) );
	    texture.needsUpdate = true;
	    var material = new THREE.MeshPhongMaterial({side: THREE.DoubleSide,
							map: texture, transparent: true,
							specular: 0xffffff,
							shininess: Number($scope.shininess) });

	    var geometry = new THREE.PlaneGeometry(2000, 2000, width-1, height-1);
	    var scale_fac = 1.0 / $scope.distns;
      console.log("BUILDING WITH", add);
	    for(i = 0; i < data.length; i++){
      		geometry.vertices[i].z = (data[i] * mult * scale_fac) + add;
	    }
	    var mesh = new THREE.Mesh(geometry, material);
	    mesh.castShadow = true;
	    mesh.receiveShadow = true;
	    mesh.position.z = 0;
	    mesh.rotation.x = - Math.PI * 0.5;
	    //$scope.wx_mesh = mesh;
	    VIEW3D.container.add(mesh);
	};

	$scope.getDEM = function( path, params ){
	    var requestParams = angular.copy( $scope.defaultDEMParams );
	    if(params.WIDTH){ requestParams.width=params.WIDTH; }
	    if(params.HEIGHT){ requestParams.height=params.HEIGHT; }
	    if(params.BBOX){ requestParams.bbox=params.BBOX; }

	    $scope.dem_width = requestParams.width;
	    $scope.dem_height = requestParams.height;

	    var bbox = requestParams['bbox'].split(',');
	    var bb = {'w':Number(bbox[0]),'s':Number(bbox[1]),'e':Number(bbox[2]),'n':Number(bbox[3])};
	    var storageName = requestParams['bbox'] + '_' + requestParams['width'] + '_' + requestParams['height']

	    // Find mid point of each edge of the bounding box.
	    var nmid = new LatLon(bb.n, (bb.w + bb.e)*0.5);
	    var smid = new LatLon(bb.s, (bb.w + bb.e)*0.5);
	    var wmid = new LatLon((bb.n + bb.s)*0.5, bb.w);
	    var emid = new LatLon((bb.n + bb.s)*0.5, bb.e);
	    $scope.distns = nmid.distanceTo(smid);
	    $scope.distew = wmid.distanceTo(emid);

	    // DEM data unlikely to change so save to local storage.
	    // Also source is external (NASA) provider, so be responsible.
	    // To clear type 'localStorage.clear()' in console.
	  //if(localStorage[storageName]){
    if(0){
		  console.log('LOADING FROM LOCAL STORAGE', storageName);
		  $scope.demdata = JSON.parse(localStorage[storageName]);
		  $scope.buildLand( $scope.demdata );
	  }else{
		  //$http.get($scope.demProviderUrl, {params:requestParams, responseType: "arraybuffer"}  ).
      $http.get('../utils/dem.bin', {responseType: "arraybuffer"}).
		  success(function(data, status, headers, config) {
			  $scope.demdata = Array.prototype.slice.call(new Int16Array(data));
			  localStorage[storageName] = JSON.stringify($scope.demdata);
			  $scope.buildLand( $scope.demdata );
		  }).
		  error(function(data, status, headers, config) {
			  console.log(status, data);
		  });
	  }
	};

	$scope.getCoverage = function( path, params ){
    //for ($i of [{u:$scope.cld_low,a:5}]){
    var list = [{u:$scope.cld_low,a:40},{u:$scope.cld_med,a:50},
          {u:$scope.cld_hig, a:150}];

    $http.get(list[0].u, { responseType: "arraybuffer"}  ).
    success(function(data, status, headers, config) {
      //$scope.rawdata = Array.prototype.slice.call(new Float32Array(data));
      var rawdata = Array.prototype.slice.call(new Float32Array(data));
      $scope.buildWx( rawdata, $scope.dem_width, $scope.dem_height,
       list[0].a, Number($scope.wx_mult) );
    }).
    error(function(data, status, headers, config) {
      alert( 'Unable to load sample cloud data. Get help.' );
      console.log(status, data);
    });
    $http.get(list[1].u, { responseType: "arraybuffer"}  ).
    success(function(data, status, headers, config) {
      //$scope.rawdata = Array.prototype.slice.call(new Float32Array(data));
      var rawdata = Array.prototype.slice.call(new Float32Array(data));
      $scope.buildWx( rawdata, $scope.dem_width, $scope.dem_height,
       list[1].a, Number($scope.wx_mult) );
    }).
    error(function(data, status, headers, config) {
      alert( 'Unable to load sample cloud data. Get help.' );
      console.log(status, data);
    });
    $http.get(list[2].u, { responseType: "arraybuffer"}  ).
    success(function(data, status, headers, config) {
      //$scope.rawdata = Array.prototype.slice.call(new Float32Array(data));
      var rawdata = Array.prototype.slice.call(new Float32Array(data));
      $scope.buildWx( rawdata, $scope.dem_width, $scope.dem_height,
       list[2].a, Number($scope.wx_mult) );
    }).
    error(function(data, status, headers, config) {
      alert( 'Unable to load sample cloud data. Get help.' );
      console.log(status, data);
    });
};

  /* = function( path, params ){
	    var requestParams = angular.copy( $scope.defaultWxParams );
	    for( k in params ){
		     requestParams[k] = params[k];
	    }
	    $http.get($scope.wxProviderUrl, {params:requestParams, responseType: "arraybuffer"}  ).
	    success(function(data, status, headers, config) {
		    $scope.rawdata = Array.prototype.slice.call(new Float32Array(data));
		    $scope.buildWx( $scope.rawdata, $scope.dem_width, $scope.dem_height );
		}).
	    error(function(data, status, headers, config) {
		    alert( 'Unable to load weather data. Check your selection and try again.' );
		    console.log(status, data);
		});
	};
  */
});
