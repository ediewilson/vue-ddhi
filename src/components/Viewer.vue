<template>
    <div>
        <div v-if="dataReady" id='viewer'>
        <section id='menu' propagate>
        <div ref='switch' class='switch-field'>
          <input type="radio" id="single" name="viz_type" value="single" checked @click="updateVizType('single')" >
          <label for="single">Single</label>
          <input type="radio" id="multi" name="viz_type" value="multi" @click="updateVizType('multi')" >
          <label for="multi">Multi</label>
        </div>
          <header>Select an interview:</header>
          <ul ref='interview-menu' id='interview-menu'>
            <MenuElement v-for="item in interviewLinks" :key="item.id" :id='item.id' :title='item.title' :activeIds="activeIds"/>
          </ul>
        </section>
        <section id='stage'>
          <header>
            <div id='title' ref='title'>
              <div>
                <h2>DDHI Data Visualization Viewer</h2>
                <h3>{{ this.title }}</h3>
                <span class='metadata'>
                  <span class='metadata-field'>
                    <span class='label'>ID</span>
                    <span class='value'></span>
                  </span>
                </span>
              </div>
            </div>
            <div id='vizcontrols'>
                <select @change="changeViz($event)" ref='vizcontrols'>
                    <option value='entity-browser'>DDHI Entity Browser</option>
                    <option value='map-tool'>Map tool</option>
                    <option value='timeline-tool'>Timeline tool</option>
                </select>
                <div class='formlabel'>Select a visualization.</div></div>
          </header>
          <div id='visualizations'>
            <slot name='visualizations'>
                <EntityBrowser v-if="selectedViz == 'entity-browser'"/>
                <Map v-if="selectedViz == 'map-tool'"/>
                <!-- <Timeline v-if="selectedViz == 'timeline-tool'" /> -->
            </slot>
          </div>
          <footer>
            <div id='media-player' propagate>
              <audio
                controls
                src="https://ddhi.agilehumanities.ca/sample-audio/alverson_hoyt.mp3">
                    Your browser does not support the
                    <code>audio</code> element.
              </audio>
            </div>
            <div id='legend'>
              <div id='legend-items'>
                <div class='events'>Events</div>
                <div class='organizations'>Organizations</div>
                <div class='persons'>Persons</div>
                <div class='places'>Places</div>
                <div class='dates'>Dates</div>
              </div>
            </div>
          </footer>
        </section>
        <section id='information-viewer'>
          <header>
            <div id='ivcontrols'>
                <select ref='ivcontrols'>
                <option value='transcript'>DDHI Transcript Viewer</option>
                <option value='wiki-viewer' >Wikipedia Viewer</option>
                </select>
                <span class='formlabel'>Select an information display.</span></div>
            <div id='tei-link'><a title='Download TEI XML File' download></a></div>
          </header>
          <slot id='infopanels' name='infopanels'>
              <Transcript v-if="infoPanelType == 'transcript'"/>
              <!-- <WikidataViewer v-if="infoPanelType == 'wiki-viewer'" /> -->
          </slot>
        </section>
    </div>
    </div>
</template>
<script>

import EntityBrowser from './EntityBrowser.vue'
import Map from './Map.vue'
// import Timeline from './Timeline.vue'
// import WikidataViewer from './WikidataViewer.vue'
import Transcript from './Transcript.vue'
import MenuElement from './MenuElement.vue'


export default {
    name: 'Viewer',
    components: {
        EntityBrowser,
        Map,
        // Timeline,
        // WikidataViewer,
        Transcript,
        MenuElement,
    },
    data () {
        return {
          dataReady: false,
            visContainer: '',
            infoContainer: '',
            visualizations: [],
            infoPanels: [],
            titleContainer: '',
            vizcontrols: '', // Selection mechanism for visualizations
            ivcontrols: '', // Selection mechanism for information view
            vizMode: 'single',
            selectedViz: 'entity-browser',
            selectedEntity: null,
            activeIds: ['dvp_033'],
            infoPanelType: 'transcript',
            availableIds: [],
            title: '',
            currId: 0,
            interviewLinks: [],

            repositoryURI: 'https://ddhi-repo-stage.dartmouth.edu', // Set from the ddhi-viewer repository attribute
            apiURI: 'https://ddhi-repo-stage.dartmouth.edu/ddhi-api', // Derived from above
            cdnAssetPath: 'modules/custom/ddhi_rest/assets/ddhi-viewer', // Derived from above
            viewer: '', // The active viewer
            viewHelper: '', // An instance of the DDHI View Plugin
            loading: false,
            items: {},  // Data keyed by ID.
            tempResult: {}, // Holding property for asynchronous data retrieval.
            supportedEntityTypes: ['events','persons','places','organizations', 'dates'], // Currently supported entities types.
            mentionedEntities: {}, // The list of entities mentioned in a transcript.
            wikidataAPIUrl: 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&sitefilter=enwiki',
            eventData: {},
            eventDateIndex: '', // Indexes event dates by id.
            multiInterview: {},
            // observed attribute state 
            entitySort: {},
            entityFilter: 'all',
            vizType: 'single',
            foreground: {},
        }
    },
    watch: {
    '$store.state.activeIds': async function() {
        this.activeIds = this.$store.getters.getActiveIds
        await this.getAssociatedEntitiesByType();

    },
     '$store.state.selectedEntity': function() {
        this.selectedEntity = this.$store.getters.getSelectedEntity
    },
    'dataReady': async function() {
        await this.connectedCallback();
        await this.getAssociatedEntitiesByType();
    },
    'availableIds': function() {
      for(var i=0;i<this.availableIds.length;i++) {
        var id = this.availableIds[i].id
        var title = this.availableIds[i].title.replace('Transcript of an Interview with a', 'Narrator:').replace('Transcript of an Interview with', 'Narrator:')
        this.interviewLinks.push({id: id, title: title})
        
      }
    },
    'tempResult': function() {
      if(this.tempResult !== null && !Object.prototype.hasOwnProperty.call(this.multiInterview.hasOwnProperty, this.tempResult.id)) {
        const id = this.tempResult.id
        var color = Math.floor(Math.random()*16777215).toString(16);
        color = '#' + color;
        var border = this.shadeColor(color)
        
        this.multiInterview[id] = {
          "dates": [],
          "events": [],
          "organizations":  [],
          "persons": [],
          "places": [],
          "tei_uri": "",
          "title": "",
          "transcript": "",
          "uri": "",
          'color': "",
          'border': ''
        } 
        
        for(const key in this.multiInterview[id]) {
          this.multiInterview[id][key] = this.tempResult[key]
        }
        
        this.multiInterview[id].color = color;
        this.multiInterview[id].border = border;
        console.log('multi after for loop', this.multiInterview)
        this.$store.commit('setMultiInterview', this.multiInterview)
      }
    },
  },
  async mounted () {
    await this.getAPIResource('collections/transcripts','availableIds');
   // this.dataReady = true;
  },
  methods: {
    async getAPIResource(resource,prop,format='json') {
      this.$axios.get(this.apiURI + '/' + resource + '?_format=' + format, {mode: 'cors'}).then((result) => {
        console.log(result.data)
        this[prop] = result.data;
        console.log('props in call', prop, this[prop])
        this.dataReady = true;
       // this.connectedCallback();
        // this.getItemDataById();

      })
      //this.dataReady = false;
    },
    async getAssociatedEntitiesByType(type='people') {

    var res = []
    if (this.activeIds !== null) {
      
      let ids = this.activeIds
      await Promise.all(ids.map(async (id) => {
        this.tempResult = null;
        var response = await this.getAPIResource("items/" + id + "/" + type, 'tempResult');
        res.push(response)
      }));
    
    console.log('multiinterview', this.multiInterview)
    return res;
  
    }
  },

    changeViz(event) {
        this.selectedViz = event.target.value;
        console.log('changed viz type')
    },

    async connectedCallback() {
       if(this.interviewLinks == []) {

    this.titleContainer = this.$refs.title;

    // Set up panel selection mechanisms (options set in registerUserComponents)

    this.vizcontrols = this.$refs.vizcontrols;

    this.ivcontrols = this.$refs.ivcontrols;


    // Populate transcripts from REST api

    //await this.getAPIResource('collections/transcripts','availableIds');


    // Set Active Menu
    console.log('availibleids in callback', this.availableIds)
    // var menu = this.$refs.interviewMenu;
    console.log('availible ids', this.availableIds)
    for(var i=0;i<this.availableIds.length;i++) {
      var id = this.availableIds[i].id
      var title = this.availableIds[i].title.replace('Transcript of an Interview with a', 'Narrator:').replace('Transcript of an Interview with', 'Narrator:')
      this.interviewLinks.push({id: id, title: title})
      
    }
    console.log('interviewLinks', this.interviewLinks)
       }
    // Fire click event on first menu item

    // var evObj = document.createEvent('Events');
    // evObj.initEvent('click', true, false);
    // menu.querySelector('a').dispatchEvent(evObj);

  },

   shadeColor(color) {
      var percent = -25;
      var R = parseInt(color.substring(1,3),16);
      var G = parseInt(color.substring(3,5),16);
      var B = parseInt(color.substring(5,7),16);

      R = parseInt(R * (100 + percent) / 100);
      G = parseInt(G * (100 + percent) / 100);
      B = parseInt(B * (100 + percent) / 100);

      R = (R<255)?R:255;  
      G = (G<255)?G:255;  
      B = (B<255)?B:255;  

      var RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
      var GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
      var BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

      return "#"+RR+GG+BB;
  },

  

  updateVizType(type) {
    this.vizMode = type;
    this.$store.commit('setVizType', type)
    if(type == 'single') {
      this.$store.commit('setActiveIds', [this.activeIds[0]])
    }
  },




  // @method observedAttributes()
  // @description Lists the attributes to monitor. Listed attributes will
  //   trigger the attributeChangedCallback when their values change.
  // @return An array of monitored attributes.
  async getItemDataById() {

    var res = []
    console.log('activeids in id data', this.activeIds)
    if (this.activeIds !== null) {
     // console.log('active id in get item data', ids)
      // TODO: Getting multi interview data
      await Promise.all(this.activeIds.map(async (id) => {
        this.tempResult = null;
        var response = await this.getAPIResource('items/' + id,'tempResult');
        this.multiInterview[id] = this.tempResult;
        this.tempResult = null;
        //console.log('item response', response)
        res.push(response)
      }));
    
    //console.log('res list: ', res)
    // TODO: return all
    return res;
    }
  },

  async attributeChangedCallback(attrName) {
    if(attrName == 'ddhi-active-id') {
      await this.getItemDataById();

      await this.getTEI(this.getAttribute('ddhi-active-id'));

      this.teiLink = this.teiResource.filepath;

      var teiLinkElement = this.shadowRoot.getElementById('tei-link').querySelector('a');
      teiLinkElement.setAttribute('href', this.teiLink);

      this.render();
    }
  },

// TODO: Add mult interview
  async getTEI(id,format='json') {
    var oneId = id.split(",")
    this.apiURI = this.$store.getters.getAPIuri;
    
    const response = await fetch(this.apiURI + '/items/' + oneId[0] + '/tei?_format=' + format, {mode: 'cors'});
    const result = await response.json();

    if (!response.ok) {
      const message = `An error has occured: ${response.status}`;
      throw new Error(message);
    }

    this.teiResource = result;

    return response;

  },


  // @method registerUserComponents()
  // @description  Registers user components like visualizations and infoPanels.
  //   setTimeout waits for the DOM to be rendered. A promise is
  //   then created to ensure that object properties were set.


  // @method propagateActiveIds()
  // @description Propagates the current active transcripts to the visualizations in
  //   the form of an attribute. The change should trigger an attribute change listener
  //   and fire the componentÄ™s handler.


  propagateActiveIds() {
    this.propagateAttributes('ddhi-active-id',this.activeIds.join());
  },

  // @method propagateSelectedEntity()
  // @description Propagates the id of a selected entity




  // @method render()
  // @description View method to display the component.

  render() {
    var item = this.getItemData();
    this.title = item.title.replace('Transcript of an Interview with a','').replace('Transcript of an Interview with','');
    this.currId = item.id
  },

    },

    // from viewer main 

  // @method loadViewerObject()
  // @description A hack. The entity web component is returning null when inserted
  //  programatically. So a method exists to inject the viewer object externally
  //  and skip tracing it through the DOM.
  // @todo Fix this. It's likely a logic error somewhere.


  propagateSelectedEntity(id) {
    this.propagateAttributes('selected-entity',id);
  },

  // @method propagateAttributes()
  // @description Propagates an attribute to the root elements of all
  //   visualizations and panel components. This is the core of the communication
  //   system between panels, as it allows a component to trigger another component's
  //   attributeChanged function and supply a value for local handling.
  //

  propagateAttributes(attr,value) {

    // Propagate to all elements in the visualizations block

    if (this.viewer.visualizations.length > 0) {
      this.viewer.visualizations.forEach(function(element){
        element.setAttribute(attr,value);

      })
    }

    // Propagate to all elements in the Information block

    if (this.viewer.infoPanels.length > 0) {
      this.viewer.infoPanels.forEach(function(element){
        element.setAttribute(attr,value);
      })
    }

    // Propagate to all elements marked with a Å„propagateÃ® attribute

    this.viewer.shadowRoot.querySelectorAll('[propagate]').forEach(function(element){
      element.setAttribute(attr,value);
    });

    // Propagate to the viewer itself

    this.viewer.setAttribute(attr,value);
  },

  // @method removePropagatedAttributes()
  // @description Removes an attribute from all propagated elements

  removePropagatedAttributes(attr) {

    // Propagate to all elements in the visualizations block

    if (this.visualizations.length > 0) {
      this.visualizations.forEach(function(element){
        element.removeAttribute(attr);

      })
    }

    // Propagate to all elements in the Information block

    if (this.infoPanels.length > 0) {
      this.infoPanels.forEach(function(element){
        element.removeAttribute(attr);
      })
    }

    // Propagate to all elements marked with a Å„propagateÃ® attribute

    this.shadowRoot.querySelectorAll('[propagate]').forEach(function(element){
      element.removeAttribute(attr);
    });

    // Propagate to the viewer itself

    this.removeAttribute(attr);
  },

  // @method getTranscripts()
  // @description Retrieves transcripts from the repository.
  async getTranscripts() {
    return this.getAPIResource('collections/transcripts','availableIds');
  },
}
</script>
<style scoped>
  * {
          box-sizing: border-box;
          color: #232526;
        }

        :host {
          display: block;
          width: 100%;
          height: 100%;
          font-family: var(--body-font);
          --ddhi-viewer-padding: 0.8rem;
          --heading-font: "Aleo-Regular", Georgia, serif;
          --body-font: "Roboto-Regular", Tahoma, sans-serif;
        }

        #viewer {
          display: grid;
          width: 100%;
          height: 100%;
          grid-template-rows: 100%;
          grid-template-columns: 10% 55.5% 34.5%
        }

        @media screen and (min-width: 62.5em) {
          #viewer {
            min-height: 500px;
          }
        }

        @media screen and (min-width: 62.5em) and (max-height: 500px) {
          #viewer {
            height: calc(500px - var(--ddhi-viewer-padding));
          }
        }

        @media screen and (min-width: 62.5em) and (min-height: 500px) {
          #viewer {
            max-height: calc(100vh - var(--ddhi-viewer-padding));
          }
        }

        section {
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: flex-start;
          overflow: hidden;;
          padding: var(--ddhi-viewer-padding)

        }

        section#menu > ul {
          overflow-y: scroll;
        }

        #stage > * {
          width: 100%;
        }

        #visualizations {
          height: 100%;
          overflow: hidden;
          flex-shrink: 1;
          flex-grow: 1;
          padding: var(--ddhi-viewer-padding)
        }

        ::slotted(div[slot='visualizations']) {
          display: block;
          height: 100%;
          width: 100%;
        }

        section#menu {
          border-right: 1px solid var(--ddhi-viewer-border-color,#E9E9E9);
          padding-left: 0 !important;
        }


        section#information-viewer {
          border-left: 1px solid var(--ddhi-viewer-border-color,#E9E9E9);
        }

        ::slotted(div[slot='infopanels']) {
          height: 100%;
          overflow-y: hidden;
        }

        #stage > header, section#information-viewer header {
          width: 100%;
          height: var(--view-header-height,6rem);
          flex-shrink: 0;
          flex-grow: 0;
          padding-bottom: var(--ddhi-viewer-padding, 1rem);
          border-bottom: 1px solid var(--ddhi-viewer-border-color,#E9E9E9);
        }

        #stage > header {
          display: flex;
          flex-direction: row;
          flex-wrap: nowrap;
          justify-content: space-between;
          overflow-y: hidden;
        }

        #information-viewer header {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
        }

        #title h2 {
          display: block;
          display: -webkit-box;
          text-overflow: ellipsis;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
          font-family: var(--heading-font);
        }

        #vizcontrols, #ivcontrols {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          height: 100%;
        }

        #stage > footer {
          width: 100%;
          height: var(--view-header-height,6rem);
          flex-shrink: 0;
          flex-grow: 1;
          background-repeat: no-repeat;
          background-position: bottom right;
          background-image: url("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1NjQuNDggMTAwIj48cGF0aCBkPSJNMCA5OS4zNlY4Mi45NGgxNi40MnYxNi40em00MSAwVjgyLjkxSDI0LjU1djE2LjQzem0yNC41NSAwVjgyLjk0SDQ5LjA5djE2LjQyem0yNC41NCAwVjgyLjg3SDczLjY0Vjk5LjN6bTI0LjU1IDBWODIuODVIOTguMTl2MTYuNDN6bTI0LjU1IDBWODIuOTRoLTE2LjQ2djE2LjQyem0yNC41NCAwVjgyLjgxaC0xNi40NXYxNi40M3ptMjQuNTUgMFY4Mi43OWgtMTYuNDV2MTYuNDN6bTI0LjU0IDBWODIuNzdIMTk2LjR2MTYuNDF6bTI0LjU1IDBWODIuNzVoLTE2LjQydjE2LjQ0ek00MSA3NVY1OC41NEgyNC41OFY3NXptMjQuNTUgMFY1OC41OEg0OS4xM1Y3NXptNDkuMDkgMFY1OC40OUg5OC4xN3YxNi40M3ptMjQuNTUgMFY1OC41OGgtMTYuNDhWNzV6bTI0LjU0IDBWNTguNDVoLTE2LjQ3djE2LjQzem0yNC41NSAwVjU4LjQzaC0xNi40N3YxNi40M3ptNDkuMDkgMFY1OC4zOUgyMjAuOXYxNi40M3pNNjUuNDkgNTEuMzlWMzVINDkuMDZ2MTYuNDF6bTczLjY0IDBWMzQuOTJIMTIyLjd2MTYuNDN6bTI0LjU0IDBWMzQuOWgtMTYuNDN2MTYuNDJ6bS05OC4yLTIzLjU1VjExLjQyTDQ5IDExLjQ0djE2LjQyem03My42NC0uMDVWMTEuMzdoLTE2LjQzVjI3Ljh6bTI0LjU1IDBWMTEuMzdoLTE2LjQ0djE2LjQyem03My42NSAyMy40OVYzNC44NGgtMTYuNDN2MTYuNDN6bTExNy40NiA0MS40MXY2LjUxaC0xNy4xMmEzLjkzIDMuOTMgMCAwMS0zLjgzLTNsLS44OC02LjdjLTYuMjcgNy0xMy41IDEwLjQ4LTIyLjA3IDEwLjQ4LTguMTYgMC0xNC40MS0zLTE5LjEtOXMtNy0xNC44OS03LTI1Ljg4YzAtMTAuMzEgMi42OC0xOC44NCA4LTI1LjM1IDUuNDgtNi44NSAxMi44NC0xMC4zMyAyMS44Ny0xMC4zM2EyNC4zMiAyNC4zMiAwIDAxMTcuNjIgNi45NHYtMjUuM2wtOC4zMi0xLjQ5YTIuOSAyLjkgMCAwMS0yLjU1LTMuMDZWMGgyMy45djg4LjE1YzQuMzguODIgNi40OSAxLjI2IDcuMjIgMS41MWEyLjc0IDIuNzQgMCAwMTIuMjYgMy4wM3pNMzMyLjIgNzkuNDdWNDcuNThhMTcuOTIgMTcuOTIgMCAwMC0xNC44My03LjVjLTYuMjcgMC0xMC45IDIuMDgtMTQuMTggNi4zNnMtNC44OSAxMC40Mi00Ljg5IDE4LjY3YzAgMTIuNSAzLjA3IDE5LjkzIDkuNCAyMi43MWExNy41NCAxNy41NCAwIDAwNyAxLjI3aC4zbC4xMy4xM2M2LjUxLS4wOSAxMi4yNS0zLjM3IDE3LjA3LTkuNzV6bTEwMiAxMy4yMnY2LjUxaC0xNy4xNGEzLjkxIDMuOTEgMCAwMS0zLjgzLTNsLS44OS02LjdjLTYuMjYgNy0xMy40OSAxMC40OC0yMi4wNiAxMC40OC04LjE3IDAtMTQuNDItMy0xOS4xLTlzLTctMTQuODktNy0yNS44OGMwLTEwLjMxIDIuNjgtMTguODQgOC0yNS4zNUMzNzcuNiAzMi45MSAzODUgMjkuNDMgMzk0IDI5LjQzYTI0LjI4IDI0LjI4IDAgMDExNy42MSA2Ljk0VjExLjA2bC04LjMyLTEuNDlhMi45IDIuOSAwIDAxLTIuNTUtMy4wNlYwaDIzLjl2ODguMTVjNC40NC44MyA2LjQ5IDEuMjYgNy4yMyAxLjUxYTIuNzQgMi43NCAwIDAxMi4zMSAzLjAzem0tMjIuNi0xMy4yMlY0Ny41OGExNy45IDE3LjkgMCAwMC0xNC44My03LjVjLTYuMjYgMC0xMC45IDIuMDgtMTQuMTcgNi4zNnMtNC45IDEwLjQyLTQuOSAxOC42N2MwIDEyLjUgMy4wOCAxOS45MyA5LjQgMjIuNzFhMTcuNjEgMTcuNjEgMCAwMDcgMS4yN2guMjlsLjEyLjEzYzYuNTQtLjA5IDEyLjI4LTMuMzcgMTcuMDktOS43NXptMTA3LjQ4IDEwLjMyYy0uNzktLjI2LTMuMTEtLjc2LTcuMDktMS41MVY1NS44M2MwLTcuODMtMi4wNy0xNC40LTYtMTlzLTkuODUtNy4xMy0xNy4yMi03LjEzYy03LjY2IDAtMTQuNDggMy0yMC43OSA5LjFWLjI3aC0yNC4xN3Y2LjI0YTMuMSAzLjEgMCAwMDIuNTkgMy4xN2MuOC4yNyAzLjUxLjc3IDguMjggMS41M3Y3Ny4yMWwtNi44NyAxLjM1YTMuMTMgMy4xMyAwIDAwLTIuNjcgMy4yM3Y2LjJoMzIuMzhWOTNhMy4xMyAzLjEzIDAgMDAtMi42NC0zLjE5Yy0uNjItLjE1LTIuNjgtLjU4LTUuODgtMS4ybC0xLS4xN1Y0OS40N2M1LjQ3LTYuMDYgMTEuMTQtOSAxNy4zNS05IDkgMCAxMy41IDUuMTcgMTMuNSAxNS4zNlY5OS4yaDIyLjcxVjkzYTMgMyAwIDAwLTIuNDgtMy4yMXptMjMtNzMuMTFhMTAuMTEgMTAuMTEgMCAwMDIuODMgMiA4LjY4IDguNjggMCAwMDcgMCAxMC4zMiAxMC4zMiAwIDAwMi44My0yIDEwLjExIDEwLjExIDAgMDAyLTIuODMgNy43MyA3LjczIDAgMDAuODctMy40OSA4LjI0IDguMjQgMCAwMC0uODctMy42MiAxMC42NSAxMC42NSAwIDAwLTItMyAxMC4xMSAxMC4xMSAwIDAwLTIuODMtMiA4LjU4IDguNTggMCAwMC03IDAgMTAuMTEgMTAuMTEgMCAwMC0yLjgzIDIgMTAuODkgMTAuODkgMCAwMC0yIDMgOCA4IDAgMDAtLjczIDMuNjIgNy41OCA3LjU4IDAgMDAuNzMgMy40OSAxMC4xMyAxMC4xMyAwIDAwMi4wMyAyLjgzem0xOS44MyA3Mi45NWwtNy0xLjM1VjMwLjc2aC0yMi42OFYzN2EzLjI1IDMuMjUgMCAwMDIuNTQgMy4xOWw3LjE0IDEuMzV2NDYuNzRsLTcuMTYgMS4zNmEzLjIzIDMuMjMgMCAwMC0yLjUyIDMuMTh2Ni4zOGgzMi4yNXYtNi4zOGEzLjI0IDMuMjQgMCAwMC0yLjU0LTMuMTl6IiBmaWxsPSIjYmRiZWJlIi8+PC9zdmc+");
          background-size: 8rem;
          padding-top: var(--ddhi-viewer-padding, 1rem);
          border-top: 1px solid var(--ddhi-viewer-border-color,#E9E9E9);
          display: flex;
          flex-direction: row;
          justify-content: flex-start;
          align-items: flex-start;
        }

        #stage > footer > * {
          width: 50%;
        }


        #media-player {
          width: 50%;
        }

        #legend {
          padding-left: var(--ddhi-viewer-padding, 1rem);
        }

        #legend-items {
          display: flex;
          flex-direction: row;
          justify-content: flex-end;
          align-items: center;
          font-size: 0.75rem;
        }

        #legend-items > * {
          position: relative;
          display: flex;
          flex-direction: row;
          justify-content: flex-start;
          align-items: center;
          margin-right: var(--ddhi-viewer-padding, 1rem);
        }

        #legend-items > *:last-child {
          margin-right: 0
        }

        #legend-items > *:before {
          content: '';
          height: 1rem;
          width: 1rem;
          background-color: var(--ddhi-viewer-border-color,#E9E9E9);
          margin-right: 0.5rem;
          border-radius: 2px;
        }

        #legend-items > .events:before {
          background-color: #9BC8EB;
        }

        #legend-items > .places:before {
          background-color: #FFA00F;
        }

        #legend-items > .persons:before {
          background-color: #9D162E;
        }

        #legend-items > .organizations:before {
          background-color: #003C73;
        }

        #legend-items > .dates:before {
          background-color: rgb(24,98,24);
        }

        h2 {
          margin: 0 0 0.5rem 0;
          font-family: "Aleo-Regular", Georgia, serif;
          font-size: 1.5rem;
          font-weight: 400;
        }

        h3 {
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 0.1rem 0;
        }


        #menu header {
          font-size: 0.7rem;
          color: #919293;
          font-weight: 800;
          text-transform: uppercase;
          padding-bottom: var(--ddhi-viewer-padding);
        }

        ul#interview-menu {
          padding: 0;
          margin: 0;
          font-size: 0.95rem;
        }

        metadata-field {
          display: inline-block;
          margin-right: 1rem;
        }

        .metadata-field .label {
          text-transform: uppercase;
          font-size: 0.75rem;
          color: #919293;
          font-weight: 800;
          display: inline-block;
          margin-right: 0.25rem;
        }

        .metadata-field .value {
          font-size: 0.75rem;
          color: #4F5152;
        }

        .formlabel {
          color: #99A2A3;
          font-size: 0.75rem;
        }

        select {
          -webkit-appearance: none;
          -webkit-border-radius: 0;
          border-radius: 0;
          border-width: 0 0 2px 0;
          border-bottom-color: #9BC8EB;
          height: 2rem;
          width: 15rem;
          text-transform: uppercase;
          font-weight: 800;
          font-size: 0.85rem;
          padding-left: 0
        }

        #tei-link a {
          display: block;
          cursor: pointer;
          height: 30px;
          width: 43px;
          background: no-repeat url("data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFkb2JlIElsbHVzdHJhdG9yIDI1LjMuMSwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246IDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCAzMCA0Mi44IiBzdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCAzMCA0Mi44OyIgeG1sOnNwYWNlPSJwcmVzZXJ2ZSI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6IzIzMjUyNjt9Cgkuc3Qxe2ZvbnQtZmFtaWx5OidSb2JvdG8tUmVndWxhcic7fQoJLnN0Mntmb250LXNpemU6Ni4zOTQzcHg7fQo8L3N0eWxlPgo8Zz4KCTxnPgoJCTx0ZXh0IHRyYW5zZm9ybT0ibWF0cml4KDEgMCAwIDEgMi40NDE0MDZlLTA0IDMzLjg1OTkpIj48dHNwYW4geD0iMCIgeT0iMCIgY2xhc3M9InN0MCBzdDEgc3QyIj5Eb3dubG9hZDwvdHNwYW4+PHRzcGFuIHg9IjEwLjEiIHk9IjcuMiIgY2xhc3M9InN0MCBzdDEgc3QyIj5URUk8L3RzcGFuPjwvdGV4dD4KCTwvZz4KCTxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0yNy40LDE1LjlIMi43Yy0xLDAtMS45LDAuOS0xLjksMS45djMuOGMwLDEsMC45LDEuOSwxLjksMS45aDI0LjdjMSwwLDEuOS0wLjksMS45LTEuOXYtMy44CgkJQzI5LjMsMTYuNywyOC41LDE1LjksMjcuNCwxNS45eiBNMjMuOSwyMi4xYy0wLjUsMC0xLTAuNC0xLTAuOWMwLTAuNSwwLjQtMC45LDEtMC45YzAuNSwwLDEsMC40LDEsMC45CgkJQzI0LjksMjEuNiwyNC40LDIyLjEsMjMuOSwyMi4xeiBNMjYuOCwyMi4xYy0wLjUsMC0xLTAuNC0xLTAuOWMwLTAuNSwwLjQtMC45LDEtMC45YzAuNSwwLDEsMC40LDEsMC45CgkJQzI3LjcsMjEuNiwyNy4zLDIyLjEsMjYuOCwyMi4xeiBNNi4zLDYuOGw2LjgsMy44djIuOUw0LjIsNy44VjUuN0wxMywwdjIuOUw2LjMsNi44eiBNMjMuOSw2LjdsLTcuMS0zLjlWMEwyNiw1LjZ2Mi4ybC05LjIsNS43CgkJdi0yLjlMMjMuOSw2Ljd6Ii8+CjwvZz4KPC9zdmc+Cg==");
          opacity: 0.7;
        }

        #tei-link a:hover {
          opacity: 1;
        }

        .switch-field {
          display: flex;
          margin-bottom: 12px;
        }
        
        .switch-field input {
          position: absolute !important;
          clip: rect(0, 0, 0, 0);
          height: 1px;
          width: 1px;
          border: 0;
          overflow: hidden;
        }
        
        .switch-field label {
          background-color: #e4e4e4;
          color: rgba(0, 0, 0, 0.6);
          font-size: 10px;
          line-height: 1;
          text-align: center;
          padding: 4px 8px;
          margin-right: -1px;
          border: 1px solid rgba(0, 0, 0, 0.2);
          box-shadow: inset 0 1px 3px rgb(0 0 0 / 30%), 0 1px rgb(255 255 255 / 10%);
          transition: all 0.1s ease-in-out;
      }
        
        .switch-field label:hover {
          cursor: pointer;
        }
        
        .switch-field input:checked + label {
          background-color: #f8f8f8;
          box-shadow: none;
        }
        
        .switch-field label:first-of-type {
          border-radius: 4px 0 0 4px;
        }
        
        .switch-field label:last-of-type {
          border-radius: 0 4px 4px 0;
        }
</style>