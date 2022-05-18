<template>
    <div class='visualization' data-name='DDHI Entity Browser'>
        <div class='controls'>
          <div id='filter-entities'>
            <select>
              <option value='all'>All entity types</option>
              <option value='event'>Event</option>
              <option value='person'>Persons</option>
              <option value='place'>Places</option>
              <option value='organization'>Organizations</option>
              <option value='date'>Dates</option>
            </select>
            <div class='formlabel'>Display type of entity</div>
          </div>
          <div id='sort-entities'>
            <select>
              <option value='data-appearance'>Appearance</option>
              <option value='data-mention'>Frequency</option>
              <option value='data-title'>Alphabetically</option>
            </select>
            <div class='formlabel'>Sort entities</div>
          </div>
        </div>
        <!--<div class='labels'><span class='devnote'>Entity descriptions to come.</span></div>-->
        <div class='entity-grid'>
          <EntityCard v-for="item in entityGrid" :item="item" v-bind:key="item.id" />
        </div>
      </div>
</template>
<script>
import EntityCard from './EntityCard.vue'
export default {
    name: 'EntityBrowser',
    components: {
        EntityCard,
    },
    data() {
        return {
          entityGrid: [],
        }
    },
     watch: {
    '$store.state.activeIds': function() {
        this.activeIds = this.$store.getters.getActiveIds
    },
     '$store.state.selectedEntity': function() {
        this.selectedEntity = this.$store.getters.getSelectedEntity
    },
    '$store.state.entitySort': function() {
        this.selectedEntity = this.$store.getters.getEntitySort
    },
    '$store.state.entityFilter': function() {
        this.selectedEntity = this.$store.getters.getEntityFilter
    }
  },
    methods: {
 connectedCallback() {
    super.connectedCallback();
    this.initFilters();
    this.initSort();
  },


  // @method observedAttributes()
  // @description Lists the attributes to monitor. Listed attributes will
  //   trigger the attributeChangedCallback when their values change.
  // @return An array of monitored attributes.

  // static get observedAttributes() {
  //   return ['ddhi-active-id','selected-entity','entity-sort','entity-filter'];
  // },

  // @method attributeChangedCallback()
  // @description HTMLElement listener that detects changes to attributes. If the active
  //   ids are changed it triggers a transcript load process.

  /*
   *  A NOTE ON BUILD PROCESS
   *  - Entities are retrieved from the repo when the active id changes.
   *  - The indexEntities() method creates entity-card objects for each entity and adds them to a general index.
   *  - IndexEntities() also adds entity ids to sorted indices for retrieval during rendering
   *  - The render() process checks the value of the sort and filter controls, retrieves the values from the selected sort index, and renders.
   */

  async attributeChangedCallback(attrName) {
    if(attrName == 'ddhi-active-id') {
      await this.getItemDataById();
      this.getMentionedEntities();
      await this.getEventData();
      this.indexEntities();
      this.render();
    }

    if (attrName == 'entity-filter') {
      this.filterEntities();
    }

    if (attrName == 'entity-sort') {
      this.render();
    }
  },


  initFilters() {
    const filterElement = this.shadowRoot.querySelector('#filter-entities select');
    var _this = this;

    _this.setAttribute('entity-filter','all');

    filterElement.addEventListener('change', event => {
     // var element = event.currentTarget;
      _this.setAttribute('entity-filter',event.target.value);
    });

  },

  initSort() {
    const sortElement = this.shadowRoot.querySelector('#sort-entities select');
    var _this = this;

    _this.setAttribute('entity-sort','appearance');

    sortElement.addEventListener('change', event => {
     // var element = event.currentTarget;
      _this.setAttribute('entity-sort',event.target.value);
    });

  },


  filterEntities() {
    const grid = this.shadowRoot.querySelector('.entity-grid');
    const entities = this.shadowRoot.querySelectorAll('entity-card');

    const filterValue = this.getAttribute('entity-filter');

    grid.style.opacity = 0;

    window.setTimeout(function() { grid.style.display = 'none' }, this.heartbeat);


    entities.forEach(function(entity) {

      if (filterValue == 'all') {
        entity.style.display = 'block';
      } else {

        if (entity.getAttribute('data-entity-type') == filterValue) {
          entity.style.display = 'block';
        } else {
          entity.style.display = 'none';
        }
      }
    });

    window.setTimeout(function() { grid.style.display = 'flex'; grid.style.opacity = 1 }, this.heartbeat * 2)
  },

  render() {

    const grid = this.shadowRoot.querySelector('.entity-grid');
    // const entities = this.shadowRoot.querySelectorAll('entity-card');
    const sortValue = this.getAttribute('entity-sort');

    if (typeof this.sortIndex[sortValue] == 'undefined') {
      return;
    }

    grid.style.opacity = 0;

    window.setTimeout(function() { grid.style.display = 'none' }, this.heartbeat);

    // Empty grid
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }

    for (var i=0;i < this.sortIndex[sortValue].length;i++) {
      var id = this.sortIndex[sortValue][i].id;
      grid.appendChild(this.entityCardIndex[id]);
    }

    this.filterEntities();

    grid.style.opacity = 1;

    window.setTimeout(function() { grid.style.display = 'flex'; grid.style.opacity = 1 }, this.heartbeat * 2)
  },

  indexEntities() {
    this.resetIndices();
    var _this = this;
    // var item = this.getItemData();
    var entityGrid = this.shadowRoot.querySelector('.entity-grid');

    entityGrid.textContent = '';

    // count appearances of a specific entity
    var entityMention = {};
    const monthLengths = {
      '01': {name: 'January', start: '1', end: '31'},
      '02': {name: 'February', start: '1', end: '28'},
      '03': {name: 'March', start: '1', end: '31'},
      '04': {name: 'April', start: '1', end: '30'},
      '05': {name: 'May', start: '1', end: '31'},
      '06': {name: 'June', start: '1', end: '30'},
      '07': {name: 'July', start: '1', end: '31'},
      '08': {name: 'August', start: '1', end: '31'},
      '09': {name: 'September', start: '1', end: '30'},
      '10': {name: 'October', start: '1', end: '31'},
      '11': {name: 'November', start: '1', end: '30'},
      '12': {name: 'December', start: '1', end: '31'}
    }

    // count order of appearance

    // var i = 1;

    // Iterate over appearances by order of mention

    this.getEntitiesByOrderOfMention().forEach(function(id,i) {
      if (typeof _this.mentionedEntities[id] == 'undefined') {
        return;
      }

      var entity = _this.mentionedEntities[id];
      //  console.log("Entity in get mentioned: ", entity);

      if (Object.prototype.hasOwnProperty.call(entityMention, entity.id)) {
        entityMention[entity.id] ++;
      } 
      else if (entity.resource_type ==='date' && Object.prototype.hasOwnProperty.call(entityMention, entity.when)) {
        entityMention[entity.when] ++;
      }
      else if(entity.resource_type === 'date'){
        entityMention[entity.when] = 1
      }
      else {
        entityMention[entity.id] = 1; // first appearance
      }



      // Create a new entity card, set attributes, and attach the entity data

      // var entity = _this.mentionedEntities[id];
      var entityCard = document.createElement('entity-card');
      entityCard.setAttribute('data-title',entity.title);
      entityCard.setAttribute('data-entity-id',entity.id);
      entityCard.setAttribute('data-entity-type',entity.resource_type);
      if(entity.resource_type !== 'date') {
        entityCard.setAttribute('data-mention',entityMention[entity.id]);
      }
      else {
        entityCard.setAttribute('data-mention', entityMention[entity.when]);
      }
      entityCard.setAttribute('data-appearance',i);
      entityCard.setData('entity',entity);
      entityCard.injectViewerObject(_this.viewer);

      // Add date information as attributes


      if (entity.resource_type === 'event' && Object.prototype.hasOwnProperty.call(_this.eventDateIndex, entity.id)) {
        entityCard.setAttribute('data-start-date',_this.eventDateIndex[entity.id].startDate);
        entityCard.setAttribute('data-end-date',_this.eventDateIndex[entity.id].endDate);
        entityCard.setAttribute('data-point-in-time',_this.eventDateIndex[entity.id].pointInTime);
        entityCard.setAttribute('data-end-date',_this.eventDateIndex[entity.id].endDate);
        entityCard.setAttribute('data-sort-date-start',_this.eventDateIndex[entity.id].sortDateStart);
        entityCard.setAttribute('data-sort-date-end',_this.eventDateIndex[entity.id].sortDateEnd);
      }

      i++;

      var label = document.createElement('div');
      label.setAttribute('slot','label');
      if(entity.resource_type !== 'date') {
        var labelstr = entity.title;
        labelstr = labelstr.length > 35 ? labelstr.substring(0,30) + '...' : labelstr;
        label.appendChild(document.createTextNode(labelstr));
      }
      else {
        let month;
        if(entity.when.length === 4) {
          label.appendChild(document.createTextNode(entity.when));
        }
        else if(entity.when.length === 7) {
          month = entity.when.substring(5,7)
          
          label.appendChild(document.createTextNode(monthLengths[month].name + ' ' + entity.when.substring(0,4)));
        }
        else if(entity.when.length === 10) {
          month = entity.when.substring(5,7)
          
          label.appendChild(document.createTextNode(monthLengths[month].name + ' ' + entity.when.substring(8,10) + ', ' + entity.when.substring(0,4)));
        }
      }

      var iconlabel = document.createElement('div');
      iconlabel.setAttribute('slot','iconlabel');
      if(entity.resource_type !== 'date') {
      iconlabel.appendChild(document.createTextNode(entityMention[entity.id]));
      }
      else { 
        iconlabel.appendChild(document.createTextNode(entityMention[entity.when]));
      }
      var heading = document.createElement('h3');
      heading.appendChild(document.createTextNode(entity.title));

      var description = document.createElement('description');


      var contents = document.createElement('div');
      contents.setAttribute('slot','contents');
      contents.appendChild(heading);
      contents.appendChild(description);

      entityCard.appendChild(iconlabel);
      entityCard.appendChild(label);
      entityCard.appendChild(contents);

      _this.indexEntityByAttribute('data-title',entityCard); // Index cards based on attributes
      _this.indexEntityByAttribute('data-appearance',entityCard,false,4);
      _this.indexEntityByFrequency(entityCard);

      _this.entityCardIndex[entity.id] = entityCard;  // Add card to general index for lookup
      if(entity.title) {
        this.entityGrid.appendChild(entityCard);  // Add card to grid
      }
    });

    this.sortIndices();

  },

  resetIndices() {
    this.sortIndex = {};
    this.entityCardIndex = {};
  },

  /**
   *  Generates sorted indices from entity-card DOM elements.
   *  Elements are added individually.
   *
   *  @param attr   The attribute
   */

  indexEntityByAttribute(attr,entity,reduce=true,padNumeric=0) {

    if (typeof this.sortIndex[attr] === "undefined") {
      this.sortIndex[attr] = [];
    }

    // Padding can help sort numbers properly.

    var key = padNumeric == 0 ? entity.getAttribute(attr) : String(entity.getAttribute(attr)).padStart(padNumeric,'0');

    var prop = {
      key: key,
      id: entity.getAttribute('data-entity-id')
    };

    function uniqueKey(a) {
      var seen = {};
      var out = [];
      var len = a.length;
      var j = 0;
      for(var i = 0; i < len; i++) {
        var key = a[i].key;
        if(seen[key] !== 1) {
          seen[key] = 1;
          out[j++] = a[i];
        }
      }
      return out;
    }

    this.sortIndex[attr].push(prop);

    if (reduce === true) {
      this.sortIndex[attr] = uniqueKey(this.sortIndex[attr]);
    }
  },

  indexEntityByFrequency(entity) {

    if (typeof this.sortIndex['data-mention'] == 'undefined') {
      this.sortIndex['data-mention'] = [];
    }

    var prop = {
      key: parseInt(entity.getAttribute('data-mention')), // key is the frequency of mentions
      id: entity.getAttribute('data-entity-id') // id is the id of the entity
    };

    // find the highest number of mentions

    function mostFrequentIndex(a) {
      var seen = {};
      var out = [];
      var len = a.length;
      for(var i = 0; i < len; i++) {
        var mcount = a[i].key; // mention count
        var id = a[i].id;
        if(typeof seen[id] === 'undefined' || mcount > seen[id]) {
          seen[id] = mcount; // capture the most frequent mention
        }
      }

      var j=0;
      for(var k = 0; k < len; k++) {
        id = a[k].id;
        var key = a[k].key;
        if(seen[id] === key) { // if the highest number of mentions (seen) is the current entity mention count, output
          out[j++] = a[k];
        }
      }

      return out;
    }

    this.sortIndex['data-mention'].push(prop);

    this.sortIndex['data-mention'] = mostFrequentIndex(this.sortIndex['data-mention']);

  },

  sortIndices() {

    function compare( a, b ) {
      if ( a.key < b.key ){
        return -1;
      }
      if ( a.key > b.key ){
        return 1;
      }
      return 0;
    }

    function reverseCompare( a, b ) {
      if ( a.key < b.key ){
        return 1;
      }
      if ( a.key > b.key ){
        return -1;
      }
      return 0;
    }

    for(const key in this.sortIndex) {
      this.sortIndex[key].sort(key=='data-mention' ? reverseCompare : compare);
    }

  }
    },
}
</script>
<style scoped>
:host {
          overflow: hidden;
          height: 100%;
        }

        * {
          transition: opacity 0.2s;
        }

        .visualization {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          overflow: auto;

        }

        .controls, .labels {
          height: 5rem;
          padding-bottom: var(--ddhi-viewer-padding, 1rem)
        }

        .controls {
          display: flex;
          flex-direction: row;
          justify-content: flex-start
        }

        .controls > * {
          margin-right: var(--ddhi-viewer-padding, 1rem)
        }

        .entity-grid {
          flex-shrink: 1;
          flex-grow: 1;
          display: flex;
          flex-direction: row;
          justify-content: flex-start;
          align-items: flex-start;
          flex-wrap: wrap;
          overflow-y: scroll;
          height: 100%;
        }

        .devnote {
          font-size: 0.75rem;
          color: #99A2A3;
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
          font-weight: 800;
          font-size: 0.75rem;
          padding-left: 0
        }

        option {
           font-size: 0.75rem;
        }

</style>