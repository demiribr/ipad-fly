'use strict';

angular.module('viewer')
  .directive('molabLocationSearch', function () {
    return {
      restrict: 'E',
      scope: { 
        'griddims': '=',
        'geobounds': '=',
        'movefunc': '='
      },
      controller: locSearchController,
      controllerAs: 'vm',
      template: '<input type="text" class="rounded" id="molabSearchInput" onfocus="javascript: if(this.value!==\'\') this.value=\'\';" placeholder="Enter a location" style="position:absolute; top:10px; left:10px;"></input>',
      link: locSearchPostLink
    }
  });

function locSearchPostLink(scope, element, attrs) {
  // location search
  scope.loc_input = $('#molabSearchInput')[0];
  var mapBounds = new google.maps.LatLngBounds(
    new google.maps.LatLng(scope.vm.coordService.minLat, scope.vm.coordService.minLon),
    new google.maps.LatLng(scope.vm.coordService.maxLat, scope.vm.coordService.maxLon)
  );
  scope.autocomplete = new google.maps.places.Autocomplete(scope.loc_input, {bounds:mapBounds});
  //scope.autocomplete.setBounds(mapBounds);
  google.maps.event.addListener(scope.autocomplete, 'place_changed', function() {
    //infowindow.close();
    var place = scope.autocomplete.getPlace();
    console.log(place);
    var loc = {lat:place.geometry.location.A, lon:place.geometry.location.F};
    var newCoords = scope.vm.coordService.lookupCoords(loc);
    console.log(newCoords);
    scope.movefunc(newCoords);
  });
}

function locSearchController($scope, molabCoordService) {
  var vm = this;

  vm.coordService = molabCoordService;
  vm.coordService.initialize($scope.griddims, $scope.geobounds);
}