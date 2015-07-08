angular.module('viewer', ["informatics-badge-directive"]).controller("MainController", function($scope, $http, $location){

  $scope.dem_width = 256;
  $scope.dem_height = 256;
  // Don't use huge numbers for width or height.  300x300 is just fine.
  // For a start, localStorage will fail with large data files as it's stored as text!!
  //
  // Issuing localStorage.clear() in console is useful too :-)

  $scope.position = null; // camera position

  $scope.cld_low = "data/cld_low.bin";
  $scope.cld_med = "data/cld_med.bin";
  $scope.cld_hig = "data/cld_hig.bin";


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

  $scope.grid_dims = {x:1261, z:1506};
  $scope.geo_bounds = [
                        {
                          lat: 48.7726557377,
                          lng: -10.1181857923
                        },
                        {
                          lat: 59.286557377,
                          lng: -10.1181857923
                        },
                        {
                          lat: 59.286557377,
                          lng: 2.42998178506
                        },
                        {
                          lat: 48.7726557377,
                          lng: 2.42998178506
                        }
                      ];

  $scope.demdata = null;
  $scope.rawdata = null;

  $scope.$watch('bboxChoice', function(){
    if($scope.wx_mesh){
      VIEW3D.container.remove( $scope.wx_mesh )
    };
    if($scope.dem_mesh){
      VIEW3D.container.remove( $scope.dem_mesh )
    };
    var params = angular.copy( $location.search());
    params.BBOX = $scope.bboxChoice;
    $scope.getDEM( $location.path(), params );
    $scope.getCoverage( $location.path(), params );
   });

   $scope.$watchGroup(['light_x','light_y','light_z'], function(){
     VIEW3D.directionalLight.position.set(Number($scope.light_x), Number($scope.light_y), Number($scope.light_z));
    });

   $scope.$watchGroup(['camera_x','camera_y','camera_z'], function(){
     VIEW3D.camera.position.set(Number($scope.camera_x), Number($scope.camera_y), Number($scope.camera_z));
   });

  $scope.moveCamera = function(pos) {
    var tween = new TWEEN.Tween(VIEW3D.camera.position).to(
              {x: pos.x, y: pos.y, z: pos.z}, 
              3000).easing(TWEEN.Easing.Sinusoidal.InOut).onUpdate(function () {
                }).onComplete(function () {
                }).start();
  }

  $scope.getCameraPosition = function() {
    $scope.position = VIEW3D.camera.position;
  }

  $scope.rebuildWx = function() {
    //VIEW3D.container.remove( $scope.wx_mesh );
    //$scope.buildWx( $scope.rawdata, $scope.dem_width, $scope.dem_height );
  }

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

  $scope.buildLand = function( data ){
    var texture = new THREE.Texture( $scope.generateTexture(data, $scope.dem_width, $scope.dem_height) );
    texture.needsUpdate = true;
    var material = new THREE.MeshPhongMaterial({
      map: texture,
      transparent: true,
      specular: 0x444444,
      shininess: 10
    });
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

  $scope.buildFlatLand = function() {
    // note: 4x4 checkboard pattern scaled so that each square is 25 by 25 pixels.
       var floorTexture = new THREE.ImageUtils.loadTexture( 'data/land.png' );
       floorTexture.flipY = false;
       var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.BackSide} );
       var floorGeometry = new THREE.PlaneGeometry($scope.grid_dims.x, $scope.grid_dims.z, 1, 1);
       var floor = new THREE.Mesh(floorGeometry, floorMaterial);
       floor.position.z = 0;
       floor.position.y = 0;
       floor.rotation.x = Math.PI / 2;
       VIEW3D.scene.add(floor);
  }

  $scope.buildHMLand = function() {

    var ambientLight = new THREE.AmbientLight( 0xffffff );
    //scene.add( ambientLight );

    var pointLight = new THREE.PointLight( 0xffffff, 0.0 );
    //scene.add( pointLight );

    pointLight.position.set(0, 300, -200);

    var ambient = 0x000000, diffuse = 0x666666, specular = 0xffffff, shininess = 50.0, scale = 100;


    var dispTexture = new THREE.ImageUtils.loadTexture('data/land.png');
    dispTexture.flipY=false;

    //var shader = THREE.ShaderLib[ "normalmap" ];
    //var uniforms = THREE.UniformsUtils.clone( shader.uniforms );
    var uniforms = THREE.UniformsUtils.merge( [

      THREE.UniformsLib[ "fog" ],
      THREE.UniformsLib[ "lights" ],
      THREE.UniformsLib[ "shadowmap" ],

      {

        "enableAO"		  : { type: "i", value: 0 },
        "enableDiffuse"	  : { type: "i", value: 0 },
        "enableSpecular"  : { type: "i", value: 0 },
        "enableReflection": { type: "i", value: 0 },
        "enableDisplacement": { type: "i", value: 0 },

        "tDisplacement": { type: "t", value: null }, // must go first as this is vertex texture
        "tDiffuse"	   : { type: "t", value: null },
        "tCube"		   : { type: "t", value: null },
        "tNormal"	   : { type: "t", value: null },
        "tSpecular"	   : { type: "t", value: null },
        "tAO"		   : { type: "t", value: null },

        "uNormalScale": { type: "v2", value: new THREE.Vector2( 1, 1 ) },

        "uDisplacementBias": { type: "f", value: 0.0 },
        "uDisplacementScale": { type: "f", value: 1.0 },

        "uDiffuseColor": { type: "c", value: new THREE.Color( 0xffffff ) },
        "uSpecularColor": { type: "c", value: new THREE.Color( 0x111111 ) },
        "uAmbientColor": { type: "c", value: new THREE.Color( 0xffffff ) },
        "uShininess": { type: "f", value: 30 },
        "uOpacity": { type: "f", value: 1 },

        "useRefract": { type: "i", value: 0 },
        "uRefractionRatio": { type: "f", value: 0.98 },
        "uReflectivity": { type: "f", value: 0.5 },

        "uOffset" : { type: "v2", value: new THREE.Vector2( 0, 0 ) },
        "uRepeat" : { type: "v2", value: new THREE.Vector2( 1, 1 ) },

        "wrapRGB"  : { type: "v3", value: new THREE.Vector3( 1, 1, 1 ) }

      }

    ] );

    uniforms[ "enableDisplacement" ] = { type: 'i', value: 1 };
    uniforms[ "enableDiffuse" ] = { type: 'i', value: 0 };
    uniforms[ "tDiffuse" ] = dispTexture;
    uniforms[ "tDiffuseOpacity" ] = { type: 'f', value: 1.0 };
    uniforms[ "tDisplacement" ] = { type: 't', value: dispTexture };
    uniforms[ "uDisplacementScale" ] = { type: 'f', value: 100 };

    uniforms[ "tNormal" ] = { type: 't', value: new THREE.ImageUtils.loadTexture( 'data/flat.png' )};

    uniforms[ "uDiffuseColor" ] = new THREE.Color( diffuse );
    uniforms[ "uSpecularColor" ] = new THREE.Color( specular );
    uniforms[ "uAmbientColor" ] = new THREE.Color( ambient );
    uniforms[ "uShininess" ] = shininess;

    uniforms[ "uPointLightPos"] =   { type: "v3", value: pointLight.position },
        uniforms[ "uPointLightColor" ] = {type: "c", value: new THREE.Color( pointLight.color )};
    uniforms[ "uAmbientLightColor" ] = {type: "c", value: new THREE.Color( ambientLight.color )};

    //uniforms[ "uPointLightPos"] =   { type: "v3", value: VIEW3D.directionalLight.position },
    //    uniforms[ "uPointLightColor" ] = {type: "c", value: new THREE.Color( VIEW3D.directionalLight.color )};
    //uniforms[ "uAmbientLightColor" ] = {type: "c", value: new THREE.Color( ambientLight.color )};

    uniforms[ "uDisplacementPostScale" ] = {type: 'f', value: 13 };

    uniforms[ "bumpScale" ] = { type: "f", value: 10 };


    var material = new THREE.ShaderMaterial( {
      uniforms: uniforms,
      vertexShader: document.getElementById( 'vertex_shader' ).textContent,
      fragmentShader: document.getElementById( 'fragment_shader' ).textContent,
      side: THREE.DoubleSide
    } );


    // GEOMETRY
    var geometry = new THREE.PlaneGeometry(1261, 1506, 512, 512);
    geometry.computeTangents();

    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    VIEW3D.scene.add(mesh);
  };


  $scope.buildWx = function( data, width, height, add, mult ){
    var texture = new THREE.Texture( $scope.generateCloudTexture(data, width, height) );
    texture.needsUpdate = true;
    var material = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      map: texture, transparent: true,
      specular: 0xffffff,
      shininess: Number($scope.shininess)
    });

    var geometry = new THREE.PlaneGeometry($scope.grid_dims.x, $scope.grid_dims.z, width-1, height-1);
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
      //$scope.buildLand( $scope.demdata );
      //$scope.buildFlatLand();
      $scope.buildHMLand();
    }else{
      //$http.get($scope.demProviderUrl, {params:requestParams, responseType: "arraybuffer"}  ).
      $http.get('data/dem.bin', {responseType: "arraybuffer"}).
      success(function(data, status, headers, config) {
        $scope.demdata = Array.prototype.slice.call(new Int16Array(data));
        localStorage[storageName] = JSON.stringify($scope.demdata);
        //$scope.buildLand( $scope.demdata );
        //$scope.buildFlatLand();
        $scope.buildHMLand();
      }).
      error(function(data, status, headers, config) {
        console.log(status, data);
      });
    }
  };

  $scope.getCoverage = function( path, params ){
    var list = [
      {u:$scope.cld_low,a:40},
      {u:$scope.cld_med,a:50},
      {u:$scope.cld_hig, a:150}
    ];

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

});
