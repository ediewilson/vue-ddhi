<template>
     <div id='info'>
        <h2>Wikipedia Viewer</h2>
        <p class='message'>Select an entity for viewing.</p>
      </div>
</template>
<script>
export default {
    name: 'WikidataViewer',
    data() {
        return {
           selectedEntity,
            selectedEntityElements: [],
            previousSelectedEntity,
            wikipediaAPIUrl: 'https://en.wikipedia.org/w/api.php?action=parse&prop=text&formatversion=2&format=json',
            wikiData: {},
            wikipediaData: {},
        }
    },
       watch: {
    '$store.state.activeIds': function() {
        this.activeIds = this.$store.getters.getActiveIds
    },
     '$store.state.selectedEntity': function() {
        this.selectedEntity = this.$store.getters.getSelectedEntity
    },
  },
    methods: {
         // @method connectedCallback()
  // @description Initializer method for this component.

  connectedCallback() {
    var _this = this;
    super.connectedCallback();
  },

  // @method observedAttributes()
  // @description Lists the attributes to monitor. Listed attributes will
  //   trigger the attributeChangedCallback when their values change.
  // @return An array of monitored attributes.

//   static get observedAttributes() {
//     return ['ddhi-active-id','selected-entity'];
//   },

  async attributeChangedCallback(attrName, oldVal, newVal) {
    if(attrName == 'ddhi-active-id') {
      await this.getItemDataById();
    }

    if(attrName == 'selected-entity') {
      if(newVal.indexOf('Q') === 0) {
        await this.getWikipediaData();
        this.render();
      } else {
        this.renderMessage("No Wikidata information is provided for this item");
      }
    }
  },

  async getWikipediaData() {

    //var requestHeaders = new Headers();
    // requestHeaders.append('Origin', window.location.hostname);

    const qid = this.getAttribute('selected-entity');

    this.wikiData = await this.getWikiData([qid]);

    const wpUrl = this.wikiData.entities[qid].sitelinks.enwiki.url;
    const wpTitle = wpUrl.split('/').pop();

    // Note &origin=* parameter required for MediaWiki/Wikidata requests

    const wpResponse = await fetch(this.wikipediaAPIUrl + '&origin=*&page=' + wpTitle);
    const wpResult = await wpResponse.json();

    if (!wpResponse.ok) {
      const message = `An error has occured: ${wpResponse.status}`;
      throw new Error(message);
    }

    this.wikipediaData = wpResult.parse;

    return wpResponse;
  },

  render() {
    if(this.wikipediaData.length ==0) {
      this.renderMessage();
      return;
    }

    var infoContainer = this.shadowRoot.querySelector('#info');
    while (infoContainer.firstChild) {
      infoContainer.removeChild(infoContainer.firstChild);
    }

    var titleElement = document.createElement('h2');
    titleElement.appendChild(document.createTextNode(this.wikipediaData.title));

    var text = document.createElement('div');
    text.classList.add('description');

    // Replace internal links with external ones.

    var wptext = String(this.wikipediaData.text).replace(/href=\"\/wiki/g,'href="https://en.wikipedia.org/wiki').replace(/\<a /g,'<a target="_blank" ');
    text.innerHTML = wptext;

    infoContainer.appendChild(titleElement);
    infoContainer.appendChild(text);


  },

  renderMessage(msgTxt) {
    var message = document.createElement('p');
    message.classList.add('message');
    var textElement = document.createTextNode(msgTxt);
    var infoContainer = this.shadowRoot.querySelector('#info');
    // Empty info container
    while (infoContainer.firstChild) {
      infoContainer.removeChild(infoContainer.firstChild);
    }
    infoContainer.appendChild(textElement);
  }
    }
}
</script>
<style scoped>

        :root {
          --black: #232526
        }

        * {
          color: var(--black);
          font-size: 0.8rem;
        }

        :host {
          display: block;
          height: 100%;
          width: 100%;
        }


        #info {
          width: 100%;
          height: 100%;
          overflow-y: scroll;
          padding-top: var(--ddhi-viewer-padding,1rem);
        }

        h2 {
          font-size: 1.2rem;
        }

        a {
          color: var(--black);
        }

        a:hover {
          color: #9D162E;
        }
</style>