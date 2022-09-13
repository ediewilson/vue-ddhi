<template>
    <div class='visualization' data-name='DDHI Entity Browser'>
        <div class='controls'>
          <div id='filter-entities'>
            <select @change="filterChange($event)">
              <option value='all' selected>All entity types</option>
              <option value='event'>Event</option>
              <option value='person'>Persons</option>
              <option value='place'>Places</option>
              <option value='organization'>Organizations</option>
              <option value='date'>Dates</option>
            </select>
            <div class='formlabel'>Display type of entity</div>
          </div>
          <div id='sort-entities'>
            <select @change="sortChange($event)">
              <option value='data-appearance'>Appearance</option>
              <option value='data-mention'>Frequency</option>
              <option value='data-title'>Alphabetically</option>
            </select>
            <div class='formlabel'>Sort entities</div>
          </div>
        </div>
        <!--<div class='labels'><span class='devnote'>Entity descriptions to come.</span></div>-->
        <div ref='entity-grid' class='entity-grid'>
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
          filter: 'all',
          sort: 'appearance',
          sortIndex: {},
          mentionedEntities: [],
          activeIds: ['dvp_033'],
          eventDateIndex: {},
          entityCardIndex: {},
          supportedEntityTypes: ['events','persons','places','organizations', 'dates'],   
          wikidataAPIUrl: 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&sitefilter=enwiki',
          wd: null,
        }
    },
    props: [
      'multiInterview',
    ],
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
    // '$store.state.entityFilter': function() {
    //     this.filter = this.$store.getters.getEntityFilter
    // }
    // '$store.state.multiInterview': function() {
    //     this.multiInterview = this.$store.getters.getMultiInterview
    //     console.log('New multi interview in entity browser', this.multiInterview)
    // },
  },
  // created() {
  //   this.initFilters();
  //   this.initSort();
  // },
    methods: {
      async init() {
        console.log('init!')
        if(this.multiInterview) {
            console.log('here', this.multiInterview[this.activeIds[0]])
            this.getMentionedEntities(this.multiInterview[this.activeIds[0]]);
            console.log('mentioned entities here!', this.mentionedEntities)
            await this.getEventData();
            this.indexEntities();
            this.render();
          }
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
  filterChange(event) {
    this.filter = event.target.value;
    this.$store.commit('setEntityFilter', {filter: this.filter})
     this.filterEntities();
  },
  sortChange(event) {
    this.sort = event.target.value;
    this.$store.commit('setEntityFilter', {sort: this.sort})
    this.render()
  },

  // TODO TODAY: need to call these when we get a new active id but only on the specific new id 
  async attributeChangedCallback(attrName) {
    if(attrName == 'ddhi-active-id') {
      this.getMentionedEntities();
      await this.getEventData();
      this.indexEntities();
      this.render();
    }
  },

// TODO ALSO TODAY: pass item as one id item from multi interview 
getMentionedEntities(item,setProperty=true) {
    var mentionedEntities = {};

    this.supportedEntityTypes.forEach(function(e){
      if (Object.prototype.hasOwnProperty.call(item, e)) {
        item[e].forEach(function(entity) {
          if(!entity.title){
            entity.title = entity.when;
            entity.resource_type = 'date';
          }
          mentionedEntities[entity.id] = entity;
        });
      }
    });

    if (setProperty==true) {
      this.mentionedEntities = mentionedEntities;
    }
    console.log('mentioned entities in browser', this.mentionedEntities)
    return mentionedEntities;
  },

   async getEventData() {
    const delay = ms => new Promise(res => setTimeout(res, ms));

    this.eventDateIndex = {};
// todo : fix for multi
    var qids = [];
    //var id = this.getActiveIdFromAttribute();
    const ids = this.activeIds
    await Promise.all(ids.map(async (id) => {
      this.eventData = this.multiInterview[id].events
      for (var i=0;i<this.eventData.length;i++) {
        if (typeof this.eventData[i] !== "undefined" && this.eventData[i].qid)
          qids.push(this.eventData[i].qid);
      }
  
      if (qids.length > 0) {
        await this.getWikiData(qids);
        await delay(2000);

        var wikiDataEvents = this.wd;

        console.log('wikidata events:', wikiDataEvents)
  
        for (var qid in wikiDataEvents.entities) {
          var claims = wikiDataEvents.entities[qid].claims; // Information claims from Wikidata... in other words the metadata
  
          this.eventDateIndex[qid] = {
            startDate: Object.prototype.hasOwnProperty.call(claims, 'P580') ? claims.P580[0].mainsnak.datavalue.value.time : null,
            endDate: Object.prototype.hasOwnProperty.call(claims, 'P582') ? claims.P582[0].mainsnak.datavalue.value.time : null,
            pointInTime: Object.prototype.hasOwnProperty.call(claims, 'P585') ? claims.P585[0].mainsnak.datavalue.value.time: null,
          }
  
          this.eventDateIndex[qid].sortDateStart = this.eventDateIndex[qid].startDate ? this.eventDateIndex[qid].startDate : this.eventDateIndex[qid].pointInTime;
          this.eventDateIndex[qid].sortDateEnd = this.eventDateIndex[qid].endDate ? this.eventDateIndex[qid].endDate : this.eventDateIndex[qid].pointInTime;
        }
      }
    }))
  },

    async getWikiData(qids=[],props=['sitelinks/urls','claims']) {

    if (qids.length > 50) {
      console.log('Maximum number of Wikidata ids exceeded.');
    }
    this.wd = null; 
    // Note &origin=* parameter required for MediaWiki/Wikidata requests
    this.$axios.get(this.wikidataAPIUrl + '&origin=*' + '&props=' + props.join('|') + '&ids=' + qids.join('|'), {mode: 'cors'}).then((result) => {
        
        console.log(result.data)
       // this.connectedCallback();
        // this.getItemDataById();
        this.wd = result.data;
        // return result.data;
    })
   // const response = await fetch(this.wikidataAPIUrl + '&origin=*' + '&props=' + props.join('|') + '&ids=' + qids.join('|'), {mode: 'cors'});

    //const response = await fetch(this.wikidataAPIUrl + '&props=' + props.join('|') + '&ids=' + qids.join('|'));
    // const result = await response.json();


    // if (!response.ok) {
    //   const message = `An error has occured: ${response.status}`;
    //   throw new Error(message);
    // }

    //return result;

  },
 

  filterEntities() {
    const grid = this.$refs.entityGrid;
    
    const entities = this.shadowRoot.querySelectorAll('entity-card');

    grid.style.opacity = 0;

    window.setTimeout(function() { grid.style.display = 'none' }, this.heartbeat);


    entities.forEach(function(entity) {

      if (this.filter == 'all') {
        entity.style.display = 'block';
      } else {

        if (entity.getAttribute('data-entity-type') == this.filter) {
          entity.style.display = 'block';
        } else {
          entity.style.display = 'none';
        }
      }
    });

    window.setTimeout(function() { grid.style.display = 'flex'; grid.style.opacity = 1 }, this.heartbeat * 2)
  },

  render() {

    const grid = this.$refs.entityGrid;
    //const entities = this.shadowRoot.querySelectorAll('entity-card');

    if (typeof this.sortIndex[this.sort] == 'undefined') {
      return;
    }

    grid.style.opacity = 0;

    window.setTimeout(function() { grid.style.display = 'none' }, this.heartbeat);

    // Empty grid
    while (grid.firstChild) {
      grid.removeChild(grid.firstChild);
    }

    for (var i=0;i < this.sortIndex[this.sort].length;i++) {
      var id = this.sortIndex[this.sort][i].id;
      grid.appendChild(this.entityCardIndex[id]);
    }

    this.filterEntities();

    grid.style.opacity = 1;

    window.setTimeout(function() { grid.style.display = 'flex'; grid.style.opacity = 1 }, this.heartbeat * 2)
  },

  getEntitiesByOrderOfMention(item=null) {
    if (item==null) {
      item = this.multiInterview[this.activeIds[0]];
    }

    var orderedEntities = [];

    // Thank you https://davidwalsh.name/convert-html-stings-dom-nodes !

    let transcript = document.createRange().createContextualFragment(item.transcript);

    transcript.querySelectorAll('span, date').forEach(function (e){
      if (e.hasAttribute('data-entity-id')) {
        orderedEntities.push(e.getAttribute('data-entity-id'));
      }
      else if (e.hasAttribute('id')) {
        
        orderedEntities.push(e.getAttribute('id'));
        // e.setAttribute('data-entity-id', e.getAttribute('when'))
        // orderedEntities.push(e.getAttribute('data-entity-id'));
      }
    });
    return orderedEntities;
  },

  indexEntities() {
    this.resetIndices();
    var _this = this;
    // var item = this.getItemData();
    var item = this.multiInterview[this.activeIds[0]];
    this.dateEntities = item.dates;
    var entityGrid = [];

    // entityGrid.textContent = '';

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
      var entityCard = {};
      entityCard['data-title'] = entity.title;
      entityCard['data-entity-id'] = entity.id;
      entityCard['data-entity-type'] = entity.resource_type;
      if(entity.resource_type !== 'date') {
        entityCard['data-mention'] = entityMention[entity.id];
      }
      else {
        entityCard['data-mention'] = entityMention[entity.when];
      }
      entityCard['data-appearance'] = i;
      entityCard['entity'] = entity;
      // Add date information as attributes


      if (entity.resource_type === 'event' && Object.prototype.hasOwnProperty.call(_this.eventDateIndex, entity.id)) {
        entityCard['data-start-date'] = _this.eventDateIndex[entity.id].startDate;
        entityCard['data-end-date'] = _this.eventDateIndex[entity.id].endDate;
        entityCard['data-point-in-time'] = _this.eventDateIndex[entity.id].pointInTime;
        entityCard['data-end-date'] = _this.eventDateIndex[entity.id].endDate;
        entityCard['data-sort-date-start'] = _this.eventDateIndex[entity.id].sortDateStart;
        entityCard['data-sort-date-end']  = _this.eventDateIndex[entity.id].sortDateEnd;
      }

      i++;

      var label = document.createElement('div');
      label.setAttribute('slot','label');
      if(entity.resource_type !== 'date') {
        var labelstr = entity.title;
        labelstr = labelstr.length > 35 ? labelstr.substring(0,30) + '...' : labelstr;
        entityCard['label'] = labelstr;
      }
      else {
        let month;
        if(entity.when.length === 4) {
          entityCard['label'] = entity.when;
        }
        else if(entity.when.length === 7) {
          month = entity.when.substring(5,7)
          entityCard['label'] = monthLengths[month].name + ' ' + entity.when.substring(0,4);
        }
        else if(entity.when.length === 10) {
          month = entity.when.substring(5,7)
          entityCard['label'] = monthLengths[month].name + ' ' + entity.when.substring(8,10) + ', ' + entity.when.substring(0,4);
        }
      }

      var iconlabel = document.createElement('div');
      iconlabel.setAttribute('slot','iconlabel');
      if(entity.resource_type !== 'date') {
       entityCard['icon-label'] = entityMention[entity.id];
      }
      else { 
        entityCard['icon-label'] = entityMention[entity.when];
      }
      // var heading = document.createElement('h3');
      // heading.appendChild(document.createTextNode(entity.title));
      entityCard['icon-label'] = entity.title
      // var description = document.createElement('description');


      // var contents = document.createElement('div');
      // contents.setAttribute('slot','contents');
      // contents.appendChild(heading);
      // contents.appendChild(description);

      // entityCard.appendChild(iconlabel);
      // entityCard.appendChild(label);
      // entityCard.appendChild(contents);

      _this.indexEntityByAttribute('data-title',entityCard); // Index cards based on attributes
      _this.indexEntityByAttribute('data-appearance',entityCard,false,4);
      _this.indexEntityByFrequency(entityCard);

      _this.entityCardIndex[entity.id] = entityCard;  // Add card to general index for lookup
      if(entity.title) {
        console.log('entity card', entityCard, entityGrid)
        entityGrid.push(entityCard);  // Add card to grid
      }
    });
    console.log('entity grid', entityGrid)
    this.entityGrid = entityGrid;
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

    var key = padNumeric == 0 ? entity[attr] : String(entity[attr]).padStart(padNumeric,'0');

    var prop = {
      key: key,
      id: entity['data-entity-id']
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
      key: parseInt(entity['data-mention']), // key is the frequency of mentions
      id: entity['data-entity-id'] // id is the id of the entity
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