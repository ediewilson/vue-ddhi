<template>
    <div>
        <div id='viewer'>
        <section id='menu' propagate>
        <div class='switch-field'>
        <input type="radio" id="single" name="viz_type" value="single" checked onclick="this.getRootNode().host.updateVizType('single')" >
        <label for="single">Single</label>
        <input type="radio" id="multi" name="viz_type" value="multi" onclick="this.getRootNode().host.updateVizType('multi')" >
        <label for="multi">Multi</label>
        </div>
          <header>Select an interview:</header>
          <ul id='interview-menu'></ul>
        </section>
        <section id='stage'>
          <header>
            <div id='title'></div>
            <div id='vizcontrols'><select></select><div class='formlabel'>Select a visualization.</div></div>
          </header>
          <div id='visualizations'>
            <slot name='visualizations'></slot>
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
            <div id='ivcontrols'><select></select><span class='formlabel'>Select an information display.</span></div>
            <div id='tei-link'><a title='Download TEI XML File' download></a></div>
          </header>
          <slot id='infopanels' name='infopanels'></slot>
        </section>
    </div>
    </div>
</template>
<script>

import EntityBrowser from './EntityBrowser.vue'
import Map from './Map.vue'
import Timeline from './Timeline.vue'
import WikidataViewer from './WikidataViewer.vue'
import Transcript from './Transcript.vue'

export default {
    name: 'Viewer',
    components: {
        EntityBrowser,
        Map,
        Timeline,
        WikidataViewer,
        Transcript,
    },
    data () {
        return {
            visContainer,
            infoContainer,
            visualizations: [],
            infoPanels: [],
            titleContainer,
            vizcontrols, // Selection mechanism for visualizations
            ivcontrols, // Selection mechanism for information view
            vizMode: 'single',
            selectedEntity,
            activeIds
        }
    },
    created () {

    },
    watch: {
    '$store.state.activeIds': function() {
        this.activeIds = this.$store.getters.getActiveIds
    },
     '$store.state.selectedEntity': function() {
        this.selectedEntity = this.$store.getters.getSelectedEntity
    }
  },
    methods: {

  async connectedCallback() {
    super.connectedCallback();

    // this.viewer is used in the parent Data componentÄ™s propagation system and
    // is derived from a selection query of an elementÄ™s parents. This will return
    // null for the viewer component itself, so it must be explicitly set.

    this.viewer = this;

    // localized version for subroutines.

    var viewer = this;


    // Assign viewer header

    this.titleContainer = this.shadowRoot.getElementById('title');

    // Set up panel selection mechanisms (options set in registerUserComponents)

    this.vizcontrols = this.shadowRoot.getElementById('vizcontrols').querySelector('select');

    this.ivcontrols = this.shadowRoot.getElementById('ivcontrols').querySelector('select');


    // Register User Visualizations and Info Panels

    await this.registerUserComponents();

    // Set up controls

    this.initializePanelSwitching();

    // Populate transcripts from REST api

    await this.getTranscripts();


    // Set Active Menu

    var menu = this.shadowRoot.getElementById('interview-menu');

    for(var i=0;i<this.availableIds.length;i++) {
      var listEl = document.createElement('li');
      var aEl = document.createElement('a');
      aEl.setAttribute('data-id',this.availableIds[i].id);
      aEl.appendChild(document.createTextNode(this.availableIds[i].title.replace('Transcript of an Interview with a', 'Narrator:').replace('Transcript of an Interview with', 'Narrator:')));
      aEl.addEventListener('click', event => {
        var element = event.currentTarget;
        var transcriptID = element.getAttribute('data-id');

        var radio = this.shadowRoot.querySelector('input[name="viz_type"]:checked')
        if(radio.value == 'single') {
          menu.querySelectorAll('.active').forEach(function(e){
            e.classList.remove('active');
          });

          element.classList.add('active');
          this.deactivateIds();
          this.activateId(transcriptID);
        }
        /*
         Logic for multiple active transcripts.
        */      
        else {
          if (element.classList.contains('active')) {
              
            this.deactivateIds(transcriptID);
            element.classList.remove('active');
          } else {
            this.activateId(transcriptID);
            element.classList.add('active');
          }
        }
      });

      listEl.appendChild(aEl);
      menu.appendChild(listEl);
    }

    // Fire click event on first menu item

    var evObj = document.createEvent('Events');
    evObj.initEvent('click', true, false);
    menu.querySelector('a').dispatchEvent(evObj);

  },

  // @method activateId()
  // @description Adds a transcript to the active list and triggers propagation.

  activateId(id) {
    const index = this.activeIds.indexOf(id);
    if (index == -1) {
      this.activeIds.push(id);
      this.$store.commit('getActiveIds', {ids: this.activeIds})
    }
    this.propagateActiveIds();
  },

  // @method deactivateIds()
  // @description Remove all active IDs. Will not trigger propagation unless an id is supplied.
  // @param id  Deactivates the supplied id and triggers propagation

  deactivateIds(id=null) {

    if (id==null) {
      this.activeIds = [];
      this.$store.commit('getActiveIds', {ids: this.activeIds})
    } else {
      const index = this.activeIds.indexOf(id);
      if (index > -1) {
        this.activeIds.splice(index, 1);
        this.$store.commit('getActiveIds', {ids: this.activeIds})
      }
      this.propagateActiveIds();
    }
  },

  updateVizType(type) {
    this.vizMode = type;
    if(this.vizMode == 'single') {
      var first = this.activeIds[0]
      var active = this.shadowRoot.querySelector('a[data-id=\"'+first+'"]')
      active.click();
      this.activateId(first);
      this.$store.commit('getActiveIds', {ids: [first]})
    }
    this.propagateAttributes('viz-type', type);
  },




  // @method observedAttributes()
  // @description Lists the attributes to monitor. Listed attributes will
  //   trigger the attributeChangedCallback when their values change.
  // @return An array of monitored attributes.

  async attributeChangedCallback(attrName, oldVal, newVal) {
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

  async registerUserComponents() {

    var viewer = this;

    var componentsReady = new Promise(function(resolve) {

      setTimeout(function() {
        [... viewer.children].forEach(function(e){
          if (e.getAttribute('slot')=='visualizations') {
            viewer.visContainer = e;
            viewer.visualizations = [... e.children];

            viewer.visualizations.forEach(function(e,i) {
              var option = document.createElement('option')
              option.setAttribute('value',i);
              option.appendChild(document.createTextNode(e.getAttribute('data-label')));
              viewer.vizcontrols.appendChild(option);
            });

          }

          if (e.getAttribute('slot')=='infopanels') {
            viewer.infoContainer = e;
            viewer.infoPanels = [... e.children];

            viewer.infoPanels.forEach(function(e,i) {
              var option = document.createElement('option')
              option.setAttribute('value',i);
              option.appendChild(document.createTextNode(e.getAttribute('data-label')));
              viewer.ivcontrols.appendChild(option);
            });
          }

          resolve();
        });
      }, 100);

    });

    await componentsReady;

    //await infoPanels;

  },

  initializePanelSwitching() {
    var viewer = this;


    viewer.visualizations.forEach(function(e,i) {
      // set panel height

      e.style.height = '100%';

      // hide panels;
      if (i > 0) {
        e.style.display = 'none';
      } else {
        e.style.display = 'block';
      }
    });


    // Add change listeners that trigger switching


    viewer.vizcontrols.addEventListener('change', event => {
      var element = event.currentTarget;
      viewer.visualizations.forEach(function(e,i) {
        e.style.display = 'none';
        e.removeAttribute('foreground')
      });

      viewer.visualizations[event.target.value].style.display = 'block';
      viewer.visualizations[event.target.value].setAttribute('foreground','')

    });

    viewer.ivcontrols.addEventListener('change', event => {
      var element = event.currentTarget;
      viewer.infoPanels.forEach(function(e,i) {
        e.style.display = 'none';
        e.removeAttribute('foreground')
      });

      viewer.infoPanels[event.target.value].style.display = 'block';
      viewer.infoPanels[event.target.value].setAttribute('foreground','');
    });


  },


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

    // Create Header

    var header = document.createElement('div');

    var title = document.createElement('h2')
    title.appendChild(document.createTextNode('DDHI Data Visualization Viewer'));

    var heading = document.createElement('h3')
    heading.appendChild(document.createTextNode(item.title.replace('Transcript of an Interview with a','').replace('Transcript of an Interview with',''))); // @todo: remove this ugly duct tape


    var idLabel = document.createElement('span');
    idLabel.classList.add('label');
    idLabel.appendChild(document.createTextNode('ID'));

    var idValue = document.createElement('span');
    idValue.classList.add('value');
    idValue.appendChild(document.createTextNode(item.id))

    var idWrapper = document.createElement('span');
    idWrapper.classList.add('metadata-field');
    idWrapper.appendChild(idLabel);
    idWrapper.appendChild(idValue);

    var metadata = document.createElement('span');
    metadata.classList.add('metadata');
    metadata.appendChild(idWrapper);

    header.appendChild(title);
    header.appendChild(heading);
    header.appendChild(metadata);

    this.renderValue(this.titleContainer,header.outerHTML);
  }

    },

    // from viewer main 

  // @method loadViewerObject()
  // @description A hack. The entity web component is returning null when inserted
  //  programatically. So a method exists to inject the viewer object externally
  //  and skip tracing it through the DOM.
  // @todo Fix this. It's likely a logic error somewhere.


  loadViewerObject(rebuild=false) {
    if (typeof this.viewer == 'undefined') {
      this.viewer = this.closestElement('ddhi-viewer'); // can be null
    }
  },

  injectViewerObject(viewer) {
    this.viewer = viewer;
    this.viewHelper = new DDHIViewHelper(this.viewer);
  },

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
  }

  // @method getTranscripts()
  // @description Retrieves transcripts from the repository.


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

        #interview-menu li {
          list-style-type: none;
          font-size: 0.75rem;
          font-weight: 400;
          margin-left: 0;
          padding-left: 0;
          margin-bottom: 0.75rem;
        }

        #interview-menu li a.active {
          font-weight: 800;
        }

        #interview-menu li:hover {
          text-decoration: underline;
        }

        #interview-menu a {
          cursor: pointer;
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