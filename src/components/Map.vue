<template>
    <div>
        <l-map ref="myMap" @ready="createLeafletMap()"></l-map>
    </div>
</template>
<script>
import L from 'leaflet';
import { LMap, LTileLayer, LMarker } from 'vue2-leaflet';

export default {
    
    name: 'Map',
    components: {
        LMap,
        LTileLayer,
        LMarker,
    },
    data () {
        return {
            mapElement, // Container
            map, // Leaflet map
            associatedPlaces,
            ids,
            multiInterview,
        }
    },
       watch: {
    '$store.state.activeIds': function() {
        this.activeIds = this.$store.getters.getActiveIds
    },
     '$store.state.selectedEntity': function() {
        this.selectedEntity = this.$store.getters.getSelectedEntity
    },
    '$store.state.foreground': function() {
        this.selectedEntity = this.$store.getters.getForeground
    },
  },
    methods: {
connectedCallback() {
    super.connectedCallback();
    this.mapElement = this.$refs.myMap.mapObject;
    // console.log('initializing map here', this.multiInterview)
    // this.multiInterview = await this.getAssociatedEntitiesByType(this,'multiInterview',this.getActiveIdFromAttribute(),'places');
  },


  // @method observedAttributes()
  // @description Lists the attributes to monitor. Listed attributes will
  //   trigger the attributeChangedCallback when their values change.
  // @return An array of monitored attributes.

//   static get observedAttributes() {
//     return ['ddhi-active-id','selected-entity','foreground'];
//   },

  // @method attributeChangedCallback()
  // @description HTMLElement listener that detects changes to attributes. If the active
  //   ids are changed it triggers a transcript load process.

  async attributeChangedCallback(attrName, oldVal, newVal) {
    if(attrName == 'ddhi-active-id') {
      this.multiInterview;
      await this.getAssociatedEntitiesByType(this,'multiInterview',this.getActiveIdFromAttribute());
      this.ids = this.getActiveIdFromAttribute().split(',')
      this.createLeafletMap();
    }

    if(attrName == 'foreground' && this.map !== null) {
      this.map.invalidateSize();
    }
  },

  renderMarkerImage() {
    return "iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAYAAACpF6WWAAAACXBIWXMAAAsSAAALEgHS3X78AAAAgElEQVQ4jWP8//8/w5yTbwQYGBgMGCgDF1LMRT6ATGCcfeI1yLADDAwM/BQa+pGBgcEhxVzkAhMDA8MGKhjIADXjAMyl/6lgIDJwZKKygWAwauiooaOGjho6qA19ADJ0IhUNPJhiLvKAKcVcpABqMKg6IBeA9C5kYGAIYGBgYAAAnd0bgt9wuMEAAAAASUVORK5CYII=";
  },

  createLeafletMap() {
    var component = this;
    this.ids = this.getActiveIdFromAttribute().split(',')

    // Previous map
    if (this.map !== null) {
      this.map.off();
      this.map.remove();
    }

    // initialize Leaflet
    this.map = L.map(this.mapElement).setView({lon: 0, lat: 0}, 2);

    // Create icon

    var Icon = L.Icon.extend({
      options: {
        iconSize:     [15, 15],
        shadowSize:   [15, 15],
        iconAnchor:   [7.5, 7.5],
        shadowAnchor: [5.25, 5.25],
        popupAnchor:  [0, -15]
      }
    });


    

    // add the OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(component.map);

    // show the scale bar on the lower left corner
    L.control.scale().addTo(component.map);
    // TODO: Nest work
    
    this.ids.forEach(function(id,i) {
      var markerIcon = L.divIcon({className: 'leaflet-marker-icon'});
      var b = '1px ' + component.multiInterview[id].border + ' solid';
      var clr = component.multiInterview[id].color;
      component.associatedPlaces = component.multiInterview[id].places 
      component.associatedPlaces.forEach(function(e,i){
        if (e.location) {
  
          var marker = L.marker([e.location.lat,e.location.lng], {icon: markerIcon, id: e.id}).addTo(component.map);
  
          marker.bindPopup(e.title).on('click',function(e){
            if (e.target.options.id != null) {
              component.propagateAttributes('data-entity-index',0);
              component.propagateAttributes('selected-entity',e.target.options.id);
            }
          });
          marker.getElement().style.backgroundColor = clr;
          marker.getElement().style.border = b;
        }
      });
    });
    // var legend = L.control({position: 'bottomleft'});
    
    // var div = L.DomUtil.create('div', 'info legend');
    // let labels = ['<strong>Narrators</strong>'];
    // const c = ['red','blue','green'];

    // for (var i = 0; i < component.ids.length; i++) {

    //     div.innerHTML += 
    //     labels.push(
    //         '<i class="circle" style="background:' + c[i] + '"></i> ' +
    //     (component.ids[i] ? component.ids[i] : '+'));

    // }
    // div.innerHTML = labels.join('<br>');
    // div.addTo(legend);
    // legend.addTo(component.map);
    
  }

  // downloadMap() {
  //     console.log("Printing map!")
  //     var HTML_Width =  this.shadowRoot.querySelector('#mapid').width;
  //     var HTML_Height = this.shadowRoot.querySelector('#mapid').height;
  //     var top_left_margin = 15;
  //     var PDF_Width = HTML_Width + (top_left_margin * 2);
  //     var PDF_Height = (PDF_Width * 1.5) + (top_left_margin * 2);
  //     var canvas_image_width = HTML_Width;
  //     var canvas_image_height = HTML_Height;
  
  //     var totalPDFPages = Math.ceil(HTML_Height / PDF_Height) - 1;
      
  //     html2canvas(this.shadowRoot.querySelector('#mapid')).then(function (canvas) {
  //         var imgData = canvas.toDataURL("image/jpeg", 1.0);
  //         var pdf = new jsPDF('p', 'pt', [PDF_Width, PDF_Height]);
  //         pdf.addImage(imgData, 'JPG', top_left_margin, top_left_margin, canvas_image_width, canvas_image_height);
  //         for (var i = 1; i <= totalPDFPages; i++) { 
  //             pdf.addPage(PDF_Width, PDF_Height);
  //             pdf.addImage(imgData, 'JPG', top_left_margin, -(PDF_Height*i)+(top_left_margin*4),canvas_image_width,canvas_image_height);
  //         }
  //         pdf.save("Your_PDF_Name.pdf");
  //        // this.shadowRoot.querySelector('#mapid').hide();
  //     });
  // }

    },
}
</script>

<style scoped>
 #mapid {
          width: 100%;
          height: 100%;
        }

        #downloads {
          padding: 0.75rem 0.75rem 0.75rem 0;
          cursor: pointer;
          background: no-repeat url('data:image/svg+xml;base64,PHN2ZyBhcmlhLWhpZGRlbj0idHJ1ZSIgZm9jdXNhYmxlPSJmYWxzZSIgZGF0YS1wcmVmaXg9ImZhcyIgZGF0YS1pY29uPSJkb3dubG9hZCIgY2xhc3M9InN2Zy1pbmxpbmUtLWZhIGZhLWRvd25sb2FkIGZhLXctMTYiIHJvbGU9ImltZyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjE2IDBoODBjMTMuMyAwIDI0IDEwLjcgMjQgMjR2MTY4aDg3LjdjMTcuOCAwIDI2LjcgMjEuNSAxNC4xIDM0LjFMMjY5LjcgMzc4LjNjLTcuNSA3LjUtMTkuOCA3LjUtMjcuMyAwTDkwLjEgMjI2LjFjLTEyLjYtMTIuNi0zLjctMzQuMSAxNC4xLTM0LjFIMTkyVjI0YzAtMTMuMyAxMC43LTI0IDI0LTI0em0yOTYgMzc2djExMmMwIDEzLjMtMTAuNyAyNC0yNCAyNEgyNGMtMTMuMyAwLTI0LTEwLjctMjQtMjRWMzc2YzAtMTMuMyAxMC43LTI0IDI0LTI0aDE0Ni43bDQ5IDQ5YzIwLjEgMjAuMSA1Mi41IDIwLjEgNzIuNiAwbDQ5LTQ5SDQ4OGMxMy4zIDAgMjQgMTAuNyAyNCAyNHptLTEyNCA4OGMwLTExLTktMjAtMjAtMjBzLTIwIDktMjAgMjAgOSAyMCAyMCAyMCAyMC05IDIwLTIwem02NCAwYzAtMTEtOS0yMC0yMC0yMHMtMjAgOS0yMCAyMCA5IDIwIDIwIDIwIDIwLTkgMjAtMjB6Ij48L3BhdGg+PC9zdmc+');
          opacity: .5;
        }

        .leaflet-marker-icon {
          border-radius: 5px;
          margin-left: -7.5px !important;
          margin-top: -7.5px !important;
          width: 15px !important;
          height: 15px !important;
          transform: translate3d(107px, -192px, 0px);
          z-index: -192;
        }
        .one {
          background-color: red;
        }
        .two {
          background-color: blue;
        }
        .three {
          background-color: green
        }
</style>