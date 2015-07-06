'use strict';

angular.module('viewer')
  .directive('molabLocationSearch', function () {
    return {
      restrict: 'E',
      scope: { 
        'griddims': '=',
        'geobounds': '='
      },
      controller: locSearchController,
      controllerAs: 'vm',
      template: '<input id="molabSearchInput" class="controls" type="text" placeholder="Enter a location" />',
      link: locSearchPostLink
    }
  });

function locSearchPostLink(scope, element, attrs) {
  // location search
  scope.loc_input = $('#molabSearchInput')[0];
  scope.autocomplete = new google.maps.places.Autocomplete(scope.loc_input);
  google.maps.event.addListener(scope.autocomplete, 'place_changed', function() {
    //infowindow.close();
    var place = scope.autocomplete.getPlace();
    console.log(place);
    var loc = {lat:place.geometry.location.A, lon:place.geometry.location.F};
    var newCoords = scope.vm.coordService.lookupCoords(loc);
    console.log(newCoords);
  });
}

function locSearchController($scope, molabCoordService) {
  var vm = this;

  vm.coordService = molabCoordService;
  vm.coordService.initialize($scope.griddims, $scope.geobounds);
}