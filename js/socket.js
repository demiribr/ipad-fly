// Connect to server
var socket = io.connect("http://sync.3dvis.informaticslab.co.uk/");
var roomId = null;
var connectedToRoom = false;
var isMobile = false;

// Check if mobile device and display connection button
// if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
//   document.getElementById("socket-connect").style.display = 'block';
//   document.getElementById("forward").style.display = 'block';
//   document.getElementById("backward").style.display = 'block';
//   isMobile = true;
// } else {
//   // Create new room and log roomId
//   socket.emit('subscribe', '');
// }

socket.on('subscription', function (data) {
    roomId = data.roomId;
    if (data.participants == 1){
      document.getElementById("socket-id").innerHTML = "Sync code: " + roomId;
    } else if (data.participants == 2) {
      if (isMobile) {
        document.getElementById("socket-id").innerHTML = "Connected to " + roomId;
      } else {
        document.getElementById("socket-id").innerHTML = "Mobile device connected";
      }
    }
    connectedToRoom = true;
    console.log('roomId set to : ' + data.roomId);
});

// Listen for cameras
socket.on('camera', function (data) {

  VIEW3D.camera.position.set(
    data.message.position.x,
    data.message.position.y,
    data.message.position.z
  );

  VIEW3D.camera.setRotationFromQuaternion(
    new THREE.Quaternion(
      data.message.quaternion._x,
      data.message.quaternion._y,
      data.message.quaternion._z,
      data.message.quaternion._w
    )
  );

});

document.getElementById("socket-connect").addEventListener("touchstart", function(event){

  // Leave default room
  roomToLeave = roomId;
  console.log("Leaving room " + roomToLeave);
  socket.emit('leave room', {room: roomToLeave});
  document.getElementById("socket-id").innerHTML = "Disconnected";

  if (connectedToRoom){
    connectedToRoom = false;
  } else {
    // Join another room
    roomId = prompt("Enter room number");
    if (roomId) {
      socket.emit('subscribe', roomId);
    }
  }

});
