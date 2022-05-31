<template>
    <div>
         <div class='transcript-menu' :class="{ disabled: vizType == 'single' }"></div>
      <div class='controls'>
        <a ref='previous' :class="{ disabled: selectedEntity != null }" class='previous'>Previous Reference</a> <a ref='next' class='next' :class="{ disabled: selectedEntity != null }" @click='previousClicked' >Next Reference</a>
      </div>
      <div class='info'></div>
    </div>
</template>
<script>
export default {
    name: 'Transcript',
    data() {
        return {
            selectedEntity: null,
            selectedEntityElements: [],
            previousSelectedEntity: null, // Used to detect a change in selected entities.
            multiInterview: {},
            ids: '',
            vizType: 'single'
        }
    },
    watch: {
        '$store.state.activeIds': function() {
            this.activeIds = this.$store.getters.getActiveIds
            if(this.vizType == 'multi') {
              this.updateTabs()
            }
        },
        '$store.state.selectedEntity': function() {
            this.selectedEntity = this.$store.getters.getSelectedEntity
        },
        '$store.state.vizType': function() {
            this.vizType = this.$store.getters.vizType
            if(this.vizType == 'multi') {
              this.updateTabs()
            }
        },
    },
  // created() {
  //   this.connectedCallback();
  // },
    methods: {
      previousClicked() {
        if (this.selectedEntity != null) {
            this.decrementSelectedEntityIndex();
            this.focusSelectedEntity();
          }
      },

      nextClicked() {
        if (this.selectedEntity != null) {
            this.incrementSelectedEntityIndex();
            this.focusSelectedEntity();
          }
      },


  // @method observedAttributes()
  // @description Lists the attributes to monitor. Listed attributes will
  //   trigger the attributeChangedCallback when their values change.
  // @return An array of monitored attributes.

//   static get observedAttributes() {
//     return ['ddhi-active-id','selected-entity','viz-type'];
//   },

  // @method attributeChangedCallback()
  // @description HTMLElement listener that detects changes to attributes. If the active
  //   ids are changed it triggers a transcript load process.

  async attributeChangedCallback(attrName) {
    if(attrName == 'ddhi-active-id') {
      await this.getItemDataById();
      await this.getAssociatedEntitiesByType(this,'multiInterview',this.getActiveIdFromAttribute());
      this.ids = this.getActiveIdFromAttribute().split(',')
      this.render();
      this.ids = this.getActiveIdFromAttribute().split(',')
    }

    if(attrName == 'selected-entity') {
      this.selectedEntity = this.hasAttribute('selected-entity') ? this.getAttribute('selected-entity') : null;
      if (this.selectedEntity != null) {

        this.getSelectedEntityElements();
        this.highlightSelectedEntity();
        //this.setSelectedEntityIndex();
        this.focusSelectedEntity();
      } 
    }
  },

  setSelectedEntityIndex() {
    if (this.previousSelectedEntity == this.selectedEntity) {
      this.incrementSelectedEntityIndex();
    } else {
      this.propagateAttributes('data-entity-index',0); // reset
    }


    this.previousSelectedEntity = this.selectedEntity;
  },

  getSelectedEntityIndex() {
    return this.hasAttribute('data-entity-index') ? parseInt(this.getAttribute('data-entity-index')) : 0;
  },

  incrementSelectedEntityIndex() {
    var index = this.getSelectedEntityIndex() + 1 // increment
    if (index == this.selectedEntityElements.length) {
      index = 0;
    }

    this.propagateAttributes('data-entity-index',index);
  },

  decrementSelectedEntityIndex() {
    var index = this.getSelectedEntityIndex() - 1; // decrement

    if (index < 0) {
      index = this.selectedEntityElements.length - 1;
    }

    this.propagateAttributes('data-entity-index',index);
  },

  getSelectedEntityElements() {
    this.selectedEntityElements = this.shadowRoot.querySelectorAll('[data-entity-id="' + this.selectedEntity + '"]');
  },

  highlightSelectedEntity() {
    this.shadowRoot.querySelectorAll('[data-entity-id]').forEach(function(e) {
      e.classList.remove('active');
    });


    this.selectedEntityElements.forEach(function(e) {
      e.classList.add('active');
    });
  },

  focusSelectedEntity() {

    if (this.selectedEntityElements.length == 0) {
      return;
    }

    var interviewElement = this.shadowRoot.querySelector('interview_body');
    var interviewTop = interviewElement.getBoundingClientRect().top;

    var topPos = this.selectedEntityElements[this.getSelectedEntityIndex()].offsetTop;

    interviewElement.scroll({
      top: topPos - interviewTop - 30,
      behavior: 'smooth'
    });


  },

  removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
},

  updateTabs() {
    var modal = this.shadowRoot.querySelector(".transcript-menu")
    
    modal.addEventListener('click', (event) => {
      const isButton = event.target.nodeName === 'BUTTON';
      if (!isButton) {
        return;
      }
      this.renderMulti(event.target.value)
    })
    
    this.removeAllChildNodes(modal);
    for(var i=0; i<this.ids.length; i++) {
      var button = document.createElement('button');
      var id = this.ids[i]
      button.value = id;
      var narrator = this.multiInterview[id].title.split(' ')
      narrator = narrator[narrator.length-1]
      var t = document.createTextNode(narrator);
      button.appendChild(t);
      modal.appendChild(button)
    }
  },

  // @method render()
  // @description View display method for this component..

  render() {
    var item = this.getItemData();

    if (Object.prototype.hasOwnProperty.call(item, 'transcript')) {
      this.renderValue(this.shadowRoot.querySelector('.info'),item.transcript);
    }
  },

  renderMulti(id) {
      var item = this.multiInterview[id];
  
      if (Object.prototype.hasOwnProperty.call(item, 'transcript')) {
        this.renderValue(this.shadowRoot.querySelector('.info'),item.transcript);
      }
    
  }
    },
}
</script>
<style scoped>
:host {
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: 3rem 1fr;
          height: 100%;
        }

        * {
         font-size: 0.8rem;
        }

        .controls {
          padding: var(--ddhi-viewer-padding, 1rem) 0;
          display: flex;
          flex-direction: row;
        }

        .controls a {
          display: flex;
          flex-direction: row;
          position: relative;
          margin-right: var(--ddhi-viewer-padding,1rem);
        }

        .previous, .next {
          font-size: 0.7rem;
          cursor: pointer;
          opacity: 0.7;
        }

        .previous:hover, .next:hover {
          opacity: 1;
        }

        .previous.disabled, .next.disabled {
          opacity: 0.3;
          pointer-events: none;
        }

        a.next:after {
          position: relative;
          content: '';
          height: 0.3rem;
          width: 0.3rem;
          top: 0.3rem;
          margin-left: 0.25rem;
          background: no-repeat url("data:image/svg+xml;base64,PHN2ZyBpZD0ibmV4dC1idG4iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDE4LjQ1IDIwIj48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6IzAwMTcxYTt9PC9zdHlsZT48L2RlZnM+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMCwyMFYxNC45TDEzLjYzLDEwLDAsNS4xVjBMMTguNDUsNy4zNXY1LjNaIi8+PC9zdmc+");
        }

        a.previous:before {
          position: relative;
          content: '';
          height: 0.3rem;
          width: 0.3rem;
          top: 0.3rem;
          margin-right: 0.25rem;
          background: no-repeat url("data:image/svg+xml;base64,PHN2ZyBpZD0iY2hhcmFjdGVyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxOC40NSAyMCI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiMwMDE3MWE7fTwvc3R5bGU+PC9kZWZzPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTE4LjQ1LDBWNS4xTDQuODIsMTAsMTguNDUsMTQuOVYyMEwwLDEyLjY1VjcuMzVaIi8+PC9zdmc+");
        }

        .info {
          overflow: auto;
        }

        interview_body {
          display: block;
          overflow-y: scroll;
          scroll-behavior: smooth;
          height: 100%;
        }

        dt, dd {
          line-height: 1.9;
        }

        dt {
          margin-bottom: 0;
          font-weight: 800;
          }

        dd {
          margin-left: 1rem;
        }

        dd span, dd date {
          display: inline-block;
          }

        dd span[data-entity-type='event'] {
          background-color: #D7E9F7;
        }

        dd span[data-entity-type='event']:hover, dd span[data-entity-type='event'].active {
          background-color: #9BC8EB;
          }

        dd span[data-entity-type='place'] {
          background-color: rgba(255,160,15,0.30);
        }

        dd span[data-entity-type='place']:hover, dd span[data-entity-type='place'].active {
          background-color: rgba(255,160,15,0.60);
          }

        dd span[data-entity-type='person'] {
          background-color: rgba(157,22,46,0.30);
        }

        dd span[data-entity-type='person']:hover, dd span[data-entity-type='person'].active {
          background-color: rgba(157,22,46,0.60);
        }

        dd span[data-entity-type='organization'] {
          background-color: rgba(0,60,115,0.30);
        }

        dd span[data-entity-type='organization']:hover, dd span[data-entity-type='organization'].active {
          background-color: rgba(0,60,115,0.60);
        }

        dd date {
          background-color: rgba(24,98,24,0.3);
        }
        dd date:hover, dd date.active {
          background-color: rgba(24,98,24,0.6);
        }

        .transcript-menu {
          overflow: hidden;
          border: 1px solid #ccc;
          background-color: #f1f1f1;
          height: max-content;
        }

        .disabled { 
          display: none;
        }
        
        /* Style the buttons inside the tab */
        .transcript-menu button {
          background-color: inherit;
          float: left;
          border: none;
          outline: none;
          cursor: pointer;
          padding: 7px 8px;
          transition: 0.3s;
          font-size: 12px;
        }
        
        /* Change background color of buttons on hover */
        .transcript-menu button:hover {
          background-color: #ddd;
        }
        
        /* Create an active/current tablink class */
        .transcript-menu button.active {
          background-color: #ccc;
        }


</style>