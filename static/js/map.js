let mapController = (function () {

  function createTapList(taplist) {
    // Creates Tap List String for Pop Ups
    let string = ''
    if (taplist[0].constructor == Object) {
      for (const property in taplist) {
        string = string + `<li>${Object.values(taplist[property])}</li>`
      }
    } else {
      for (let i = 0; i < taplist.length; i++) {
        string = string + `<li>${taplist[i]}</li>`
      }
    }
    return string
  }

  function displayRadioValue() {
    // Check filter buttons

    var ele = document.getElementsByName('options');
    let checked;
    for (let x = 0; x < ele.length; x++) {
      if (ele[x].checked) {
        if (x === 0) {
          checked = 'brands'
        } else {
          checked = 'locations'
        }
      }

    }
    return checked
  }


  function clearDropdown() {
    // Clear autocomplete dropdown
    let body = d3.select('body')
    let removeDropdown = body.select('#tap-autocomplete-list');
    if (removeDropdown) {
      removeDropdown.remove();
    }
  }

  return {
    createMap: function (layerGroup) {

      // Initialize Map
      let baseMap = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 20,
        id: 'mapbox/dark-v10',
        accessToken: 'pk.eyJ1IjoiY29zdGNvLWhvdGRvZyIsImEiOiJjazYxajkyNGUwNDljM2xvZnZjZmxmcjJqIn0.zW5wSAD1e2DKZIjtlAwNtQ'
      })
      let mymap = L.map('map', {
        layers: [baseMap, layerGroup],
        zoomControl: true,
        scrollWheelZoom: true
      }).setView([38.577488, -121.494763], 12);
      mymap.on('focus', function () {
        mymap.scrollWheelZoom.enable();
      });
      mymap.on('blur', function () {
        mymap.scrollWheelZoom.disable();
      });

      let baseMaps = {
        "Dark": baseMap,
      }
      let overlayMaps = {
        "Locations": layerGroup
      }

      // Search bar auto-complete
      let searchbar = d3.select('#searchbar')
      searchbar.on('keypress', function () {

        if (searchbar.property('value').length > 3) {
          let search = searchbar.property('value');
          let option = displayRadioValue();

          // Brand autocomplete search
          if (option === 'brands') {
            d3.json(`https://sacontap.wn.r.appspot.com/api/taps/${search}`).then(function (result, error) {

              // Clear previous results
              clearDropdown()

              // Array of found taps
              let taps = result.map(d => d.tap);

              // Continer for holding the auto-complete results
              let dropContainer = d3.select('.auto-complete').append('datalist').attr('id', 'tap-autocomplete-list');

              // Loop through taps and populate auto-complete list
              for (x in taps) {
                let dropdown = dropContainer
                  .data(taps)
                  .append('option')
                  .text(taps[x]);
              };

            })
          }

          // Restaurant autocomplete search
          if (option === 'locations') {
            d3.json(`https://sacontap.wn.r.appspot.com/api/accounts_query/${search}`).then(function (result, error) {

              // Clear previous results
              clearDropdown()

              // Array of found taps
              let locations = result.map(d => d.location);

              // Continer for holding the auto-complete results
              let dropContainer = d3.select('.auto-complete').append('datalist').attr('id', 'tap-autocomplete-list');

              // Loop through taps and populate auto-complete list
              for (x in locations) {
                let dropdown = dropContainer
                  .data(locations)
                  .append('option')
                  .text(locations[x]);
              };
            })
          }
        }
      })

      // Apply markers to map based on search
      d3.select('#searchbtn').on('click', function (d) {
        let search = searchbar.property('value');
        let option = displayRadioValue();
        let layer;

        if (option === 'brands') {
          d3.json(`https://sacontap.wn.r.appspot.com/api/taps/${search}`).then(function (result, error) {
            mymap.removeLayer(layerGroup)
            mymap.eachLayer(d => {
              mymap.removeLayer(d)
            })
            layer = mapController.createMarkers(result,search);
            mymap.addLayer(baseMap);
            mymap.addLayer(layer);

          })
        } else {
          // search for accounts
          d3.json(`https://sacontap.wn.r.appspot.com/api/accounts_query/${search}`).then(function (result, error) {
            mymap.removeLayer(layerGroup)
            mymap.eachLayer(d => {
              mymap.removeLayer(d);
            })
            layer = mapController.createAccountMarkers(result,search);
            mymap.addLayer(baseMap);
            mymap.addLayer(layer);
            mapController.createResultsList(result);
          })
        }
      })
    },

    createAccountMarkers: function (result,query) {
      // Create account markers for map
      let markers = [];
      let obj;
      result.map(function (d) {
        obj = {
          location: d.location,
          coordinates: [d.lat, d.lng],
          taps: d.taps
        }
        markers.push(obj);
      })
      let layerGroup = [];
      let layer;
      for (var i = 0; i < markers.length; i++) {
        var marker = markers[i];
        layer = L.marker(marker.coordinates).bindPopup(`<h5 class="popup-location-name"> ${marker.location}</h5>${createTapList(marker.taps)}`);
        layerGroup.push(layer);
      };
      var markerGroup = L.layerGroup(layerGroup);
      let number = markers.length;
      let popup = d3.select('#alert')
      popup.text(`Showing ${number} results for '${query}'`)

      return markerGroup
    },


    createMarkers: function (result,query) {
      // Create Markers for the map
      // Dictionary containing locations
      let markers = [];
      let obj;


      result.map(function (d) {

        for (var z = 0; z < d.locations.length; z++) {
          obj = {
            coordinates: [d.locations[z].lat, d.locations[z].lng],
            name: d.locations[z].location,
            address: d.locations[z].address,
            city: d.locations[z].city,
            zipcode: d.locations[z].zipcode,
            tap: []
          }
          markers.push(obj)
        }

      });
      let number = markers.length;
      let popup = d3.select('#alert')
      popup.text(`Showing ${number} results for '${query}'`)
      // Push all taps associated with account to Markers List
      let location;
      result.map(function (d) {
        for (let x = 0; x < markers.length; x++) {
          location = markers[x].name;
          let check;
          for (var y = 0; y < d.locations.length; y++) {
            check = d.locations[y].location;
            if (location === check) {
              markers[x].tap.push(d.tap)
            }
          }
        }
      })
      // Create Layer Group
      let layerGroup = [];
      let layer;
      for (var i = 0; i < markers.length; i++) {
        var marker = markers[i];
        layer = L.marker(marker.coordinates).bindPopup(`<h5 class="popup-location-name">${marker.name}</h5><h6>${marker.address}, ${marker.city} ${marker.zipcode}</h6>${createTapList(marker.tap)}`);
        layerGroup.push(layer);
      };
      var markerGroup = L.layerGroup(layerGroup);
      return markerGroup
    }
  }
})();

let controller = (function (mapCtrl) {

  let query = 'bud';

  return {

    init: function () {
      let data = d3.json(`https://sacontap.wn.r.appspot.com/api/taps/${query}`).then(function (result, error) {
        let layer = mapCtrl.createMarkers(result,query)
        mapCtrl.createMap(layer)
        d3.select('#search').text(query)
        $('.alert').alert()

      });
    }
  }
})(mapController);


controller.init();
