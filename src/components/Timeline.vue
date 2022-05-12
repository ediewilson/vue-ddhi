<template>
   <div>
      <div class='controls'>
          <div id='timeline-type'>
              <select>
                <option value='narrative'>Narrative Order</option>
                <option value='chronological'>Chronological Order</option>
                <option value='all'>Narrative Order vs. Chronological Order</option>
              </select>
              <div class='formlabel'>Timeline type</div>
          </div>

          
          <div class="range-controls">
            <div class="x-controls">
              <button class="control-button minus" id="xZoomOutButton" onclick="this.getRootNode().host.zoomOutX()"></button>
              <span class="button-desc">Chronological Scale</span>
              <button class="control-button plus" id="xZoomInButton" onclick="this.getRootNode().host.zoomInX()"></button>
            </div>
          </div>
          <details class="download-opts">
            <summary title="Download timeline" id="downloads"></summary>
            <nav class="menu"></nav>
          </details>  
      </div>

      <div class="threedtimeline">
        <div class="y-controls">
          <button class="control-button minus" id="yZoomOutButton" onclick="this.getRootNode().host.zoomOutY()"></button>
          <div class="transform-wrapper">
            <span class="button-desc-y">Interview</span>
          </div>
          <button class="control-button plus" id="yZoomInButton" onclick="this.getRootNode().host.zoomInY()"></button>
        </div>
        <div id="container"></div>
      </div>

      <div id="container2"></div>
      <!--div class="grid-container"-->
        <div class="entity-grid"></div>
        <!--div class="proximity-modal"></div-->
      <!--/div-->
      </div>
</template>
          
<script>
export default {
    name: 'Timeline',
    data () {
        return {
            timelineContainer,
            timeline,
            timeline2,
            currentChartType,
            associatedEntities,
            mentionedEntities,
            yZoom: 20,
            teiResource,
            eventData,
            narrativeDownload,
            dateEntities,
        }
    },
       watch: {
    '$store.state.activeIds': function() {
        this.activeIds = this.$store.getters.getActiveIds
    },
     '$store.state.selectedEntity': function() {
        this.selectedEntity = this.$store.getters.getSelectedEntity
    },
    '$store.state.entityFilter': function() {
        this.selectedEntity = this.$store.getters.getEntityFilter
    }
  },
    methods: {
  // @method connectedCallback()
  // @description Initializer method for this component.
  
  connectedCallback() {
    super.connectedCallback();
    this.timelineContainer = this.shadowRoot.querySelector('#container');
    this.container2 = this.shadowRoot.querySelector('#container2');
    this.initFilters();
    this.initSort();
    this.filterEntities();
  },
  
    
    // @method observedAttributes()
    // @description Lists the attributes to monitor. Listed attributes will
    //   trigger the attributeChangedCallback when their values change.
    // @return An array of monitored attributes.
    
    // static get observedAttributes() {
    //   return ['ddhi-active-id','selected-entity','entity-filter'];
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
    
    async attributeChangedCallback(attrName, oldVal, newVal) {    
      if(attrName == 'ddhi-active-id') {
        await this.getItemDataById();
        this.getMentionedEntities();
        await this.getEventData();
        this.indexEntities();
        this.render();
        this.filterEntities();
      }
    },
    
     
    initFilters() {
      const filterElement = this.shadowRoot.querySelector('#timeline-type select');
      const downloadElement = this.shadowRoot.querySelector('#downloads');
      const downloadParent = this.shadowRoot.querySelector('.download-opts');

      var _this = this;
      
      this.changeViewer('narrative');
      this.currentChartType = 'narrative';   
        
      filterElement.addEventListener('change', event => {
        let timelineType = event.target.value;
        downloadParent.removeAttribute('open');
        this.changeViewer(timelineType); 
      });

      downloadElement.addEventListener('click', event => {
        this.createDownloadModal();
      });
    },

    initSort() {
      var _this = this;
    },


    async getItemDataById() {
      var component = this;
      
      this.itemsDataReset();
          
      var activeId = this.getActiveIdFromAttribute();
          
      if (activeId !== null) {
        component.tempResult = null;
        var response = await this.getAssociatedEntitiesByType(this,'multiInterview',activeId,'transcripts'); 
        this.itemsDataSetItem(activeId,component.tempResult);
        component.tempResult = null;
      }   

      return response;
    },

    changeViewer(timelineType) {      
      const currTimeline = this.shadowRoot.querySelector('.threedtimeline');
      const timelineWrap = this.shadowRoot.querySelector('#container');
      const entityGrid = this.shadowRoot.querySelector('.entity-grid');
      const timeline = this.shadowRoot.querySelector('#container2');
      // const prox = this.shadowRoot.querySelector('.proximity-modal');

      const rcontrol = this.shadowRoot.querySelector('.range-controls');


      this.currentChartType = timelineType;

      if(timelineType === 'all') {
        currTimeline.style.display = 'flex';
        timelineWrap.style.display = 'block';
        rcontrol.style.visibility = 'visible';

        entityGrid.style.display = 'none';
        // prox.style.display = 'none';
        timeline.style.display = 'none';
      }
      else if(timelineType === 'narrative') {
        currTimeline.style.display = 'none';
        timelineWrap.style.display = 'none';
        rcontrol.style.visibility = 'hidden';

        entityGrid.style.display = 'flex';
        // prox.style.display = 'flex';
        timeline.style.display = 'none';
      }
      else if(timelineType === 'chronological') {
        timeline.style.display = 'block';
        rcontrol.style.visibility = 'hidden';

        currTimeline.style.display = 'none';
        timelineWrap.style.display = 'none';
        entityGrid.style.display = 'none';
        // prox.style.display = 'none';
      }
    },

    removeAllChildNodes(parent) {
        while (parent.firstChild) {
            parent.removeChild(parent.firstChild);
        }
    },

    createDownloadModal() {
      var modal = this.shadowRoot.querySelector(".menu")
      this.removeAllChildNodes(modal);
      const downloadParent = this.shadowRoot.querySelector('.download-opts');
      var format = document.createElement('div');
      format.classList.add('download-title');
      var q = document.createTextNode("Select format:");
      format.appendChild(q);
      modal.appendChild(format);

      var dSvg = document.createElement('div');
      dSvg.value = 'svg';
      var t = document.createTextNode("SVG");
      dSvg.appendChild(t);
      dSvg.onclick = function () {
        this.getRootNode().host.downloadChart('svg');
        downloadParent.removeAttribute('open');
      }

      var dPng = document.createElement('div');
      dPng.value = 'png';
      var r = document.createTextNode("PNG");
      dPng.appendChild(r);
      dPng.onclick = function () {
        this.getRootNode().host.downloadChart('png');
        downloadParent.removeAttribute('open');
      }
      var dCsv = document.createElement('div');
      var s = document.createTextNode("CSV");
      dCsv.appendChild(s);
      dCsv.value = 'csv';
      dCsv.onclick = function () {
        this.getRootNode().host.downloadChart('csv');
        downloadParent.removeAttribute('open');
      }

      if (this.currentChartType === 'all') {
        modal.appendChild(dSvg);
        modal.appendChild(dPng);
      }
      else if (this.currentChartType === 'chronological') {
        modal.appendChild(dSvg);
        modal.appendChild(dPng);
        modal.appendChild(dCsv);
      }
      else if (this.currentChartType === 'narrative') {
        modal.appendChild(dCsv);
      }
    },

    createCsv(data, fileName) {
      let csvBody = 'appearance, event, start date, end date\n';
      data.forEach(item => {
        csvBody = csvBody + item.appearance + ', ' + item.name + ', ' + item.start + ', ' + item.end + '\n'
      })

      let csvContent = "data:text/csv;charset=utf-8," + csvBody;

      var encodedUri = encodeURI(csvContent);
      var link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      let name = fileName + '.csv';

      link.setAttribute("download", name);
      document.body.appendChild(link); 

      link.click();
    },

    downloadChart(downloadType) {
      let toDownload;

      let title = this.viewer.titleContainer.querySelector('h3');
      title = title.textContent.substring(1)
      title = title.replace(' ', '_');
      
      if (this.currentChartType === 'all') {
        toDownload = this.timeline;
        title = title + '_narrative_v_chronological';
      }
      else if (this.currentChartType === 'chronological') {
        toDownload = this.timeline2;
        title = title + '_chronological';
      }
      else if (this.currentChartType === 'narrative') {
        toDownload = this.narrativeDownload;
        // console.log("narrative download is", toDownload);
        title = title + '_narrative';
      }

      // console.log('Download type in change', downloadType);
      // console.log('Downloading type is', this.currentChartType)

      title = title + '_timeline'
      anychart.exports.filename(title); 
      
      if(downloadType === 'svg') {
        // console.log('SVG download of', this.currentChartType);
        toDownload.saveAsSvg();
      }
      else if(downloadType === 'png') {
        toDownload.saveAsPng();

      }
      else if(downloadType === 'csv') {
        if(this.currentChartType === 'narrative'){
          this.createCsv(toDownload, title);
        }
        else {
          toDownload.saveAsCsv();
        }
      }
    },
    
    
    filterEntities() {
      const grid = this.shadowRoot.querySelector('.entity-grid');
      const entities = this.shadowRoot.querySelectorAll('entity-card');
      
      const filterValue = 'all';
      
      grid.style.opacity = 0;
      
      window.setTimeout(function() { grid.style.display = 'none' }, this.heartbeat);
  
      entities.forEach(function(entity,i) {
      
        if (filterValue == 'all') {
          if (entity.getAttribute('data-entity-type') === 'date' || entity.getAttribute('data-entity-type') === 'event') {
            entity.style.display = 'block';
          } else {
          entity.style.display = 'none';
        }
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
      const entities = this.shadowRoot.querySelectorAll('entity-card');
      const sortValue = 'appearance';
      
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


    resetCharts() {
      // clears the current timelines to redraw with new data
      let chartContainer = this.shadowRoot.querySelector('#container');
      this.removeAllChildNodes(chartContainer);
      chartContainer = this.shadowRoot.querySelector('#container2');
      this.removeAllChildNodes(chartContainer);
    },


    indexEntities() {
      this.resetIndices();
      this.resetCharts();

      var _this = this;
      var item = this.getItemData();
      this.dateEntities = item.dates;
      var entityGrid = this.shadowRoot.querySelector('.entity-grid');
      
      entityGrid.textContent = '';
              
      // count appearances of a specific entity
      var entityMention = {};
      
      // count order of appearance
      var i = 1;
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

      // create data for chart 
      var orderedEvents = [];
      var data = [];
      var timelineNamesList = [];
      var timelineRange = [];
      var dateRanges = [];

      var proximityModals = {};
      
      // Iterate over appearances by order of mention
      
      this.getEntitiesByOrderOfMention().forEach(function(id,i) {

        if (typeof _this.mentionedEntities[id] == 'undefined') {
          return;
        }
        
        var entity = _this.mentionedEntities[id];
        if (entity.resource_type === 'event' || entity.resource_type === 'date') {

          
          if (entityMention.hasOwnProperty(entity.id)) {
            entityMention[entity.id] ++;
          } else {
            entityMention[entity.id] = 1; // first appearance
          }
        
        
        // Create a new entity card, set attributes, and attach the entity data
        
          var entity = _this.mentionedEntities[id];
          var entityCard = document.createElement('entity-card');
            entityCard.setAttribute('data-title',entity.title);
            entityCard.setAttribute('data-entity-id',entity.id);
            entityCard.setAttribute('data-entity-type',entity.resource_type);
            entityCard.setAttribute('data-mention',entityMention[entity.id]);
            entityCard.setAttribute('data-appearance',i);
            entityCard.setData('entity',entity);
            entityCard.injectViewerObject(_this.viewer);
            
            // Add date information as attributes
          
          
          if (entity.resource_type === 'event' && _this.eventDateIndex.hasOwnProperty(entity.id)) {
            entityCard.setAttribute('data-start-date',_this.eventDateIndex[entity.id].startDate);
            entityCard.setAttribute('data-end-date',_this.eventDateIndex[entity.id].endDate);
            entityCard.setAttribute('data-point-in-time',_this.eventDateIndex[entity.id].pointInTime);
            entityCard.setAttribute('data-end-date',_this.eventDateIndex[entity.id].endDate);
            entityCard.setAttribute('data-sort-date-start',_this.eventDateIndex[entity.id].sortDateStart);
            entityCard.setAttribute('data-sort-date-end',_this.eventDateIndex[entity.id].sortDateEnd);

          }

          else if (entity.resource_type === 'date') {
            // var xmlDoc = new DOMParser().parseFromString(entity.utterance,'text/xml');
            // // console.log(xmlDoc);
            // proximityModals[entity.id] = [];
            // var dates = xmlDoc.getElementsByTagName("date");
            // var other = xmlDoc.getElementsByTagName("span");
            
            // if(dates.length !== 1) {
            //   for (let i = 0; i < dates.length; i++) {
            //     if(dates[i].getAttribute('id') !== entity.id){
            //       proximityModals[entity.id].push(dates[i]);
            //     }              
            //   }
            // }
            // for (let i = 0; i < other.length; i++) {
            //   proximityModals[entity.id].push(other[i]);                     
            // }

            entityCard.setAttribute('data-start-date',entity.startDate);
            entityCard.setAttribute('data-end-date', entity.endDate);
            entityCard.setAttribute('data-point-in-time',entity.pointInTime);
            entityCard.setAttribute('data-sort-date-start', entity.sortDateStart);
            entityCard.setAttribute('data-sort-date-end', entity.sortDateEnd);
            // @TODO: Add this functionality back in 
            // entityCard.addEventListener('click',() => {
            //   console.log("nearby entities are... ", proximityModals[entity.id]);
            //   _this.makeProximityModal(proximityModals[entity.id]);
            // });

          }

          if (entity.resource_type === 'event') {
            var timelineData = document.createElement('div');
            timelineData.setAttribute('slot','date-range');

            var label = document.createElement('div');
            label.setAttribute('slot','label');

            let start = entityCard.getAttribute('data-start-date');
            let end = entityCard.getAttribute('data-end-date');
            let point = entityCard.getAttribute('data-point-in-time');            
            var startTime, endTime;
  
            if(start == 'null' || end == 'null') {
              point = point.substring(1);
              let pointInTime = _this.dateParser(point, entity.title);

              startTime = pointInTime;
              endTime = pointInTime;

              timelineData.appendChild(document.createTextNode(pointInTime));

            }
            else if(point == 'null') {
              start = start.substring(1);
              startTime = _this.dateParser(start, entity.title);
  
              end = end.substring(1);
              endTime = _this.dateParser(end, entity.title);
              
              timelineData.appendChild(document.createTextNode(startTime + ' - ' + endTime));
            }
            else if(start != 'null' && end != 'null'&& point != 'null') {
              start = start.substring(1);
              startTime = _this.dateParser(start, entity.title);
  
              end = end.substring(1);
              
  
              endTime = _this.dateParser(end, entity.title);
             
              timelineData.appendChild(document.createTextNode(startTime + ' - ' + endTime));
            }
            else {
              timelineData.appendChild(document.createTextNode(' - '));
            }
            entityCard.appendChild(timelineData);
            
            var labelstr = entity.title.charAt(0).toUpperCase() + entity.title.slice(1);
            labelstr = labelstr.length > 35 ? labelstr.substring(0,30) + '...' : labelstr;
            label.appendChild(document.createTextNode(labelstr));

            entityCard.addEventListener('click',() => {
              const prox = _this.shadowRoot.querySelector('.proximity-modal');
              _this.removeAllChildNodes(prox);
            });


          } else if (entity.resource_type === 'date') {
            var label = document.createElement('div');
            label.setAttribute('slot','label');
                     
            var startTime, endTime;
  
            if(entity.when.length === 4) {
              startTime = entity.when + '-01-01';
              endTime = entity.when + '-12-31';
              label.appendChild(document.createTextNode(entity.when));
            }
            else if(entity.when.length === 7) {
              var month = entity.when.substring(5,7)
              startTime = entity.when + '-01';
              endTime = entity.when + '-' + monthLengths[month].end;
              label.appendChild(document.createTextNode(monthLengths[month].name + ' ' + entity.when.substring(0,4)));
            }
            else if(entity.when.length === 10) {
              var month = entity.when.substring(5,7)
              startTime = entity.when;
              endTime = entity.when;
              label.appendChild(document.createTextNode(monthLengths[month].name + ' ' + entity.when.substring(8,10) + ', ' + entity.when.substring(0,4)));
            }
          }
          
          i++; 
        
        
          
        var iconlabel = document.createElement('div');
          iconlabel.setAttribute('slot','iconlabel');
          iconlabel.appendChild(document.createTextNode(entityMention[entity.id]));
        
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
        
        
        _this.indexEntityByAttribute('data-appearance',entityCard,true,4);
  
        _this.entityCardIndex[entity.id] = entityCard;  // Add card to general index for lookup
        
        if (entity.resource_type === 'event' || entity.resource_type === 'date') {
          if (labelstr === 'Vietnam War') {
            startTime = "Jul 08 1959"
          }
          let toAdd = {};
          if (entity.resource_type === 'event') {
            toAdd = {
              id: i,
              name: labelstr,
              periods: [
                {id: entity.id, start: startTime, end: endTime, fill: "#9BC8EB", stroke: "#9BC8EB", selected: {fill: "#9BC8EB", stroke: "#9BC8EB"}}
              ],
              entity: entityCard,
              resource: entity.resource_type,
            }
          } else {
            toAdd = {
              id: i,
              name: labelstr,
              periods: [
                {id: entity.id, start: startTime, end: endTime, fill: "#186218", stroke: "#186218", selected: {fill: "#186218", stroke: "#186218"}}
              ],
              entity: entityCard,
              resource: entity.resource_type,
            }
          }
          if(entity.title) {

            
            let tempRange = {name: labelstr, start: startTime, end: endTime, entity: entityCard, resource: entity.resource_type}
            
            data.push(toAdd);
            timelineRange.push(tempRange);
            orderedEvents.push({appearance: orderedEvents.length + 1, name: labelstr, start: startTime, end: endTime});
          
            entityGrid.appendChild(entityCard);
          }
          //entityGrid.appendChild(entityCard);
        }

      }
      });

      timelineRange.forEach((c) => {
          if (!timelineNamesList.includes(c.name) && c.resource !== 'date') {
            timelineNamesList.push(c.name);
          }
      });

      let timelineMoments = []; 
      let timelineDataRanges = []; 

      timelineRange.forEach((c) => {
        if (timelineNamesList.includes(c.name)) {
          var search = timelineNamesList.indexOf(c.name);
          // TODO: Fix hard coding
          if(c.start === c.end && c.name !== 'Korean conflict' && c.resourse !== 'date') {
            timelineMoments.push({x: c.start, y: c.name, entity: c.entity});
          }
          else {
            timelineDataRanges.push(c);
          }
          timelineNamesList[search] = c;
        }
      });
      
      this.eventData = data;
      this.sortIndices();
      this.drawChart(data);
      this.drawTimeline(timelineDataRanges, timelineMoments);
      this.narrativeDownload = orderedEvents;
      // console.log("Proximity modals:", proximityModals);
    },
    
    resetIndices() {
      this.sortIndex = {};
      this.entityCardIndex = {};
    },


    // @ TODO: ADD this back in 
    // makeProximityModal(entityList) {
    //   let s = new Set()

    //   var _this = this;
    //   const prox = this.shadowRoot.querySelector('.proximity-modal');
    //   this.removeAllChildNodes(prox);

    //   var title = document.createElement('div');
    //   var t = document.createTextNode("Nearby Entities");
    //   title.classList.add('prox-modal-title');
    //   title.appendChild(t);
    //   prox.appendChild(title);

    //   for (let i = 0; i < entityList.length; i++) {
    //     var mult = false;
    //     var entId = entityList[i].getAttribute('id');
        
    //     if(!entId.includes('date')){
    //       entId = entId.substring(7, entId.length);
    //       console.log(entId);

    //       if(entId.charAt(entId.length - 1) !== '-') {
    //         mult = true;
    //         var mention = parseInt(entId.substring(entId.indexOf('-') + 1, entId.length))
    //         console.log(mention);
    //       }

    //       while(entId.includes('-')) {
    //         entId = entId.substring(0, entId.length - 1);
    //       }
    //     }
        
    //     //console.log(entId, this.mentionedEntities);
    //     if(!s.has(entId)) {
    //       s.add(entId);
    //       var entity = _this.mentionedEntities[entId];
    //       var entityCard = document.createElement('entity-card');
    //         entityCard.setAttribute('data-title',entity.title);
    //         entityCard.setAttribute('data-entity-id',entity.id);
    //         entityCard.setAttribute('data-entity-type',entity.resource_type);
    //         entityCard.setData('entity',entity);
    //         entityCard.injectViewerObject(_this.viewer);

    //         if(mult) {
    //           entityCard.setAttribute('data-mention', mention);
    //         }
    //         // Add date information as attributes
          
          
    //       if (entity.resource_type === 'event' && _this.eventDateIndex.hasOwnProperty(entity.id)) {
    //         entityCard.setAttribute('data-start-date',_this.eventDateIndex[entity.id].startDate);
    //         entityCard.setAttribute('data-end-date',_this.eventDateIndex[entity.id].endDate);
    //         entityCard.setAttribute('data-point-in-time',_this.eventDateIndex[entity.id].pointInTime);
    //         entityCard.setAttribute('data-end-date',_this.eventDateIndex[entity.id].endDate);
    //         entityCard.setAttribute('data-sort-date-start',_this.eventDateIndex[entity.id].sortDateStart);
    //         entityCard.setAttribute('data-sort-date-end',_this.eventDateIndex[entity.id].sortDateEnd);
            
    //       }

    //       if (entity.resource_type === 'event') {
    //         var timelineData = document.createElement('div');
    //         timelineData.setAttribute('slot','date-range');

    //         var label = document.createElement('div');
    //         label.setAttribute('slot','label');

    //         let start = entityCard.getAttribute('data-start-date');
    //         let end = entityCard.getAttribute('data-end-date');
    //         let point = entityCard.getAttribute('data-point-in-time');            
    //         var startTime, endTime;
  
    //         if(start == 'null' || end == 'null') {
    //           point = point.substring(1);
    //           let pointInTime = _this.dateParser(point, entity.title);

    //           startTime = pointInTime;
    //           endTime = pointInTime;

    //           timelineData.appendChild(document.createTextNode(pointInTime));

    //         }
    //         else if(point == 'null') {
    //           start = start.substring(1);
    //           startTime = _this.dateParser(start, entity.title);
  
    //           end = end.substring(1);
    //           endTime = _this.dateParser(end, entity.title);
              
    //           timelineData.appendChild(document.createTextNode(startTime + ' - ' + endTime));
    //         }
    //         else if(start != 'null' && end != 'null'&& point != 'null') {
    //           start = start.substring(1);
    //           startTime = _this.dateParser(start, entity.title);
  
    //           end = end.substring(1);
              
  
    //           endTime = _this.dateParser(end, entity.title);
             
    //           timelineData.appendChild(document.createTextNode(startTime + ' - ' + endTime));
    //         }
    //         else {
    //           timelineData.appendChild(document.createTextNode(' - '));
    //         }
    //         entityCard.appendChild(timelineData);
            
    //         var labelstr = entity.title.charAt(0).toUpperCase() + entity.title.slice(1);
    //         labelstr = labelstr.length > 35 ? labelstr.substring(0,30) + '...' : labelstr;
    //         label.appendChild(document.createTextNode(labelstr));
    //       }

    //       else if (entity.resource_type === 'date') {
            

    //         entityCard.setAttribute('data-start-date',entity.startDate);
    //         entityCard.setAttribute('data-end-date', entity.endDate);
    //         entityCard.setAttribute('data-point-in-time',entity.pointInTime);
    //         entityCard.setAttribute('data-sort-date-start', entity.sortDateStart);
    //         entityCard.setAttribute('data-sort-date-end', entity.sortDateEnd);
    //         var label = document.createElement('div');
    //         label.setAttribute('slot','label');
                     
    //         var startTime, endTime;
  
    //         if(entity.when.length === 4) {
    //           startTime = entity.when + '-01-01';
    //           endTime = entity.when + '-12-31';
    //           label.appendChild(document.createTextNode(entity.when));
    //         }
    //         else if(entity.when.length === 7) {
    //           var month = entity.when.substring(5,7)
    //           startTime = entity.when + '-01';
    //           endTime = entity.when + '-' + monthLengths[month].end;
    //           label.appendChild(document.createTextNode(monthLengths[month].name + ' ' + entity.when.substring(0,4)));
    //         }
    //         else if(entity.when.length === 10) {
    //           var month = entity.when.substring(5,7)
    //           startTime = entity.when;
    //           endTime = entity.when;
    //           label.appendChild(document.createTextNode(monthLengths[month].name + ' ' + entity.when.substring(8,10) + ', ' + entity.when.substring(0,4)));
    //         }
    //       }
    //       else {
    //         var label = document.createElement('div');
    //         label.setAttribute('slot','label');
    //         label.appendChild(document.createTextNode(entity.title));

    //       }

    //       var heading = document.createElement('h3');
    //       heading.appendChild(document.createTextNode(entity.title));
    //       var description = document.createElement('description');
          
    //       var contents = document.createElement('div');
    //         contents.setAttribute('slot','contents');
    //         contents.appendChild(heading);
    //         contents.appendChild(description);

            
    //       entityCard.appendChild(label);
    //       entityCard.appendChild(contents);
          
    //       prox.appendChild(entityCard);
    //   }
    //     }
        
    // }
    // @ TODO (important) parse dates based on local time 
    dateParser(rawDate, event) {
      const d = new Date(rawDate);

      if (d.toString() === 'Invalid Date') {

        let year = rawDate.substring(0,4);
        let month = rawDate.substring(5,7);
        let day = rawDate.substring(8,10);
        
        let date = ''
        if (year !== '0000') {
          date = date + year;
          if(month !== '00') {
            date = date + '-' + month;
          }
          if(day !== '00') {
            date = date + '-' + day;
          }
        }
        return date;
      }
      // Dates are coming out wrong with timezone
      if((event.includes('war') || event.includes('War')) && !event.includes('merica')) {
        let date = new Date(d.getTime() + 60*7*60000);
        //console.log(date)
        return date.toDateString().substring(4);
      }

      return d.toDateString().substring(4);
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
          var id = a[k].id;
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
      
    },
  
  drawChart(data) {      
      // create a data tree
      var treeData = anychart.data.tree(data, "as-tree");    
      // create a chart
      var chart = anychart.ganttResource(); 
      
      // set the data
      chart.data(treeData);   
      chart.background("#ffffff00");

      var periodLabels = chart.getTimeline().periods().labels();
      periodLabels.enabled(true);
      periodLabels.useHtml(true);
      // periodLabels.position('auto');

    
      
      periodLabels.fontWeight(400);
      periodLabels.format("{%name}");

      chart.container(this.timelineContainer);    

      chart.draw();   
      chart.rowStroke("0.0 #64b5f6");
      chart.columnStroke("0.0 #64b5f6");
      chart.getTimeline().scale().zoomLevels([
        [
          {unit: "month", count: 1},
          {unit: "year", count: 1},
          {unit: "year", count: 10}
        ]
      ]);

      var header = chart.getTimeline().header();
      header.level(0).enabled(true);
      header.level(0).height('0.4rem');
      header.level(1).enabled(true);
      header.level(2).enabled(true);

      // header.level(1).height('0.2rem');



      var column_1 = chart.dataGrid().column(0);
      column_1.enabled(false);

      var column_2 = chart.dataGrid().column(1);
      column_2.enabled(false);

      // var periods = chart.getTimeline().periods();
      // periods.selected() = periods.normal();
      
      
      chart.getTimeline().tooltip().format(
        "Start: {%start}{dateTimeFormat:dd MMM y} \nEnd: {%end}{dateTimeFormat:dd MMM y}"
      );

      chart.splitterPosition("0%");

      // fit elements to the width of the timeline
      chart.fitAll();  
      
      this.timeline = chart;
      this.graphEntityClicks();

  },

  // entity clicks 
  graphEntityClicks() {
    this.timeline.listen("rowClick", function(e){
      var entitycard = e['item'].get('entity');
      
      entitycard.propagateSelectedEntity(entitycard.id);
      if (entitycard.hasAttribute('data-mention')) {
        entitycard.propagateAttributes('data-entity-index',entitycard.getAttribute('data-mention') - 1);
      }
      entitycard.propagateSelectedEntity(entitycard.id);
    });
  },

  // zoom the timeline in
    zoomInX() {
      this.timeline.zoomIn(2);
    },

    // zoom the timeline out
    zoomOutX() {
      this.timeline.zoomOut(2);
    },

    zoomInY() {
      this.yZoom = this.yZoom + 3
      this.timeline.defaultRowHeight(this.yZoom);
    },

    // zoom the timeline out
    zoomOutY() {
      if (this.yZoom > 3) {
        this.yZoom = this.yZoom - 3;
      } 
      this.timeline.defaultRowHeight(this.yZoom);
    },

    drawTimeline(data, moments) {
      // create a chart
      var chart = anychart.timeline();
      chart.background("#ffffff00");

      var rangeSeries = chart.range(data);
      var momentSeries = chart.moment(moments);

      momentSeries.direction("down");
      momentSeries.normal().fill("#9BC8EB");
      momentSeries.selected().fill("#9BC8EB");
      momentSeries.normal().stroke("#9BC8EB");
      momentSeries.selected().stroke("#9BC8EB");
      
      rangeSeries.tooltip().title().enabled(false);
      rangeSeries.tooltip().separator().enabled(false);  

      rangeSeries.tooltip().format("{%name} \n\nStart: {%start}{dateTimeFormat:MMM dd y} \nEnd: {%end}{dateTimeFormat:MMM dd y}");
      rangeSeries.labels(true);
      rangeSeries.labels().fontWeight(400);
      rangeSeries.labels().format("{%name}");

      rangeSeries.normal().fill("#9BC8EB");
      rangeSeries.selected().fill("#9BC8EB");
      rangeSeries.normal().stroke("#2069a2");
      rangeSeries.selected().stroke("#2069a2");
      
      momentSeries.tooltip().title().enabled(false);
      momentSeries.tooltip().separator().enabled(false);  
      momentSeries.tooltip().format("{%y} \n\nDate: {%x}{dateTimeFormat:MMM dd y}");

      chart.title("Timeline of Transcript Events");

      chart.axis().height(50);

      // var zoomController = anychart.ui.zoom();
      // zoomController.target(chart);
      // zoomController.render();
      
      // chart.scale().zoomLevels([
      //   [
      //     {"unit": "month", count: 1},
      //     {"unit": "year", count: 1}
      //   ]
      // ]);

    

      chart.container(this.container2);    
      chart.draw(); 
      chart.scroller(true);  
      chart.fit();

      // // not working yet 
      // var zoomController = anychart.ui.zoom();
      // zoomController.target(chart);
      // zoomController.render();


      this.timeline2 = chart;
      this.timelineEntityClicks();

  },

  timelineEntityClicks() {
    this.timeline2.listen("pointClick", function(e){
      // console.log("Event click in timeline");
      var index = e.iterator.getIndex();
      var series = e.point.getSeries();
      series = series.zI

      // console.log(index, series);
      var entitycard = series[index].entity;
      
      entitycard.propagateSelectedEntity(entitycard.id);
      if (entitycard.hasAttribute('data-mention')) {
        entitycard.propagateAttributes('data-entity-index',entitycard.getAttribute('data-mention') - 1);
      }
      entitycard.propagateSelectedEntity(entitycard.id);
    });
  },
},

}
</script>


 <style>
      :host {
          overflow: hidden;
          height: 100%;
        }
        
        * {
          transition: opacity 0.2s;
          --card-txt: #9BC8EB00;
        }
                
        .visualization {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
          overflow: auto;

        }
        
        .controls, .labels {
          height: 3rem;
          padding-bottom: var(--ddhi-viewer-padding, 1rem)
        }
        
        .controls {
          display: flex;
          flex-direction: row;
          justify-content: space-between; 
        }
        
        .controls > * {
          margin-right: var(--ddhi-viewer-padding, 1rem)  
        }

        .downloadOptions {
          padding-top: 30px;
          display: flex;
          flex-direction: row;
          justify-content: space-around; 
          align-items: center;
        }
        
        .downloadOptions > * {
          margin-right: var(--ddhi-viewer-padding, 1rem)  
        }

        .downloadOption {
          height: 1.8rem;
          display: table-cell;
          vertical-align: middle;
          font-size: 1rem;
          font-weight: 500;
        }
   
        .entity-grid {
          flex-shrink: 1;
          display: none;
          flex-direction: column;
          align-items: center;
          height: 100%;
          overflow-y: scroll;
          width: 70%;
          width: 100%
        }

         .proximity-modal {
          flex-shrink: 1;
           display: none;
         flex-direction: column;
           align-items: center;
           height: 100%;
           width: 30%;
           overflow-y: scroll;
           padding-left: 8px;
           border-left: 1px solid #E9E9E9;
         }

        entity-card {
          display: flex;
          justify-content: center;
          width: 100%;
          margin-bottom: 1rem;
        }

        entity-card[data-entity-type='event'] {
          margin-bottom: 2.5rem;
        }

        #container {
          width: 100%;
          height: 100%;
          margin: 0px;
          padding: 0px 0px 12px 0px;
        }

        .threedtimeline {
          height: 90%;
          display: flex;
          flex-direction: row;
        }

        #container2 {
          width: 100%;
          height: 90%;
          margin: 0px;
          padding: 0px 0px 12px 0px;
          display: none;
          position: relative;
          top: -12px;
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

        .button-desc {
          font-size: 12px;
          font: "Roboto-Regular", Tahoma, sans-serif;
          color: #99A2A3;
          margin: 6px;
        }
            
        
        summary {
          writing-mode: vertical-lr;
          margin: 0.25rem  0 0.25rem  0.25rem;
          cursor: pointer;
          user-select: none;
          outline: none;
          transition: transform 200ms ease-in-out 0s;
        }
        summary::before,
        summary::after {
          position: static;
          top: 0;
          left: 0;
        }
        summary:hover {
          transform: scale(1.1);
        }
        summary::marker {
          font-size: 0;
        }
        summary::-webkit-details-marker {
          display: none;
        }
        details[open] .menu {
          animation-name: menuAnim;
        }

        .download-title {
          font-size: 10.5px;
          margin: 0.25rem !important;
          text-align: left;
        }
       
        .menu {
          height: 0;
          width: fit-content;
          border-radius: var(--cornerRad);
          background-color: #f7f7f7;
          box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.1);
          margin-top: 8px;
          margin-left: -52px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          animation: closeMenu 300ms ease-in-out forwards;
          position: relative;
          z-index: 100;
        }
        .menu div {
          font: "Roboto-Regular", Tahoma, sans-serif;
          padding: 0.25rem 0.75rem;
          margin: 0 1rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.2);
          text-align: center;
          cursor: pointer;
        }

        .menu div:nth-last-of-type(1) {
          border-bottom: none;
          padding-bottom: 0.35rem;
        }
        
        details::before {
          color: var(--secoColor);
          position: absolute;
          margin-left: 80px;
          padding: 10px 10px;
          opacity: 0.5;
        }
        details[open]::before {
          animation: fadeMe 300ms linear forwards;
        }
        @keyframes menuAnim {
          0% {
            height: 0;
          }
          100% {
            height: fit-content;
          }
        }
        @keyframes fadeMe {
          0% {
            opacity: 0.4;
          }
          100% {
            opacity: 0;
          }
        }

        #downloads {
          padding: 0.75rem 1.75rem 0.75rem 0;
          cursor: pointer;
          background: no-repeat url('data:image/svg+xml;base64,PHN2ZyBhcmlhLWhpZGRlbj0idHJ1ZSIgZm9jdXNhYmxlPSJmYWxzZSIgZGF0YS1wcmVmaXg9ImZhcyIgZGF0YS1pY29uPSJkb3dubG9hZCIgY2xhc3M9InN2Zy1pbmxpbmUtLWZhIGZhLWRvd25sb2FkIGZhLXctMTYiIHJvbGU9ImltZyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNTEyIDUxMiI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjE2IDBoODBjMTMuMyAwIDI0IDEwLjcgMjQgMjR2MTY4aDg3LjdjMTcuOCAwIDI2LjcgMjEuNSAxNC4xIDM0LjFMMjY5LjcgMzc4LjNjLTcuNSA3LjUtMTkuOCA3LjUtMjcuMyAwTDkwLjEgMjI2LjFjLTEyLjYtMTIuNi0zLjctMzQuMSAxNC4xLTM0LjFIMTkyVjI0YzAtMTMuMyAxMC43LTI0IDI0LTI0em0yOTYgMzc2djExMmMwIDEzLjMtMTAuNyAyNC0yNCAyNEgyNGMtMTMuMyAwLTI0LTEwLjctMjQtMjRWMzc2YzAtMTMuMyAxMC43LTI0IDI0LTI0aDE0Ni43bDQ5IDQ5YzIwLjEgMjAuMSA1Mi41IDIwLjEgNzIuNiAwbDQ5LTQ5SDQ4OGMxMy4zIDAgMjQgMTAuNyAyNCAyNHptLTEyNCA4OGMwLTExLTktMjAtMjAtMjBzLTIwIDktMjAgMjAgOSAyMCAyMCAyMCAyMC05IDIwLTIwem02NCAwYzAtMTEtOS0yMC0yMC0yMHMtMjAgOS0yMCAyMCA5IDIwIDIwIDIwIDIwLTkgMjAtMjB6Ij48L3BhdGg+PC9zdmc+');
          opacity: .5;
        }

        .x-controls {
          display: inline-flex;
          justify-content: space-between;
          padding-right: 1.5rem;

        }

        .y-controls {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 24px;
          padding-right: 12px;
          justify-content: center;
          align-items: center;
        }

        .button-desc-y { 
          font-size: 12px;
          font: "Roboto-Regular", Tahoma, sans-serif;
          color: #99A2A3;
          margin: 6px;
        }
        #yZoomOutButton {
          transform: rotate(270deg);
          margin-bottom: 18px;
        }

        #yZoomInButton {
          transform: rotate(270deg);
          margin-top: 18px;
        }

        .transform-wrapper {
          transform: rotate(270deg);
          margin: 12px 0;
        }

        .minus {
          height: 1.8rem;
          border: 0;
          border-radius: 0.25rem;
          color: white;
          line-height: 1.2;
          white-space: nowrap;
          text-decoration: none;
          padding: 0.75rem 0.75rem;
          margin: 0.25rem;
          cursor: pointer;
          background: no-repeat url('data:image/svg+xml;base64,PHN2ZyBhcmlhLWhpZGRlbj0idHJ1ZSIgZm9jdXNhYmxlPSJmYWxzZSIgZGF0YS1wcmVmaXg9ImZhciIgZGF0YS1pY29uPSJtaW51cy1zcXVhcmUiIGNsYXNzPSJzdmctaW5saW5lLS1mYSBmYS1taW51cy1zcXVhcmUgZmEtdy0xNCIgcm9sZT0iaW1nIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NDggNTEyIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xMDggMjg0Yy02LjYgMC0xMi01LjQtMTItMTJ2LTMyYzAtNi42IDUuNC0xMiAxMi0xMmgyMzJjNi42IDAgMTIgNS40IDEyIDEydjMyYzAgNi42LTUuNCAxMi0xMiAxMkgxMDh6TTQ0OCA4MHYzNTJjMCAyNi41LTIxLjUgNDgtNDggNDhINDhjLTI2LjUgMC00OC0yMS41LTQ4LTQ4VjgwYzAtMjYuNSAyMS41LTQ4IDQ4LTQ4aDM1MmMyNi41IDAgNDggMjEuNSA0OCA0OHptLTQ4IDM0NlY4NmMwLTMuMy0yLjctNi02LTZINTRjLTMuMyAwLTYgMi43LTYgNnYzNDBjMCAzLjMgMi43IDYgNiA2aDM0MGMzLjMgMCA2LTIuNyA2LTZ6Ij48L3BhdGg+PC9zdmc+');
          opacity: .5;
        }

        .plus {
          height: 1.8rem;
          border: 0;
          border-radius: 0.25rem;
          color: white;
          padding: 0.75rem 0.75rem;
          margin: 0.25rem;
          cursor: pointer;
          background: no-repeat url('data:image/svg+xml;base64,PHN2ZyBhcmlhLWhpZGRlbj0idHJ1ZSIgZm9jdXNhYmxlPSJmYWxzZSIgZGF0YS1wcmVmaXg9ImZhciIgZGF0YS1pY29uPSJwbHVzLXNxdWFyZSIgY2xhc3M9InN2Zy1pbmxpbmUtLWZhIGZhLXBsdXMtc3F1YXJlIGZhLXctMTQiIHJvbGU9ImltZyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgNDQ4IDUxMiI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMzUyIDI0MHYzMmMwIDYuNi01LjQgMTItMTIgMTJoLTg4djg4YzAgNi42LTUuNCAxMi0xMiAxMmgtMzJjLTYuNiAwLTEyLTUuNC0xMi0xMnYtODhoLTg4Yy02LjYgMC0xMi01LjQtMTItMTJ2LTMyYzAtNi42IDUuNC0xMiAxMi0xMmg4OHYtODhjMC02LjYgNS40LTEyIDEyLTEyaDMyYzYuNiAwIDEyIDUuNCAxMiAxMnY4OGg4OGM2LjYgMCAxMiA1LjQgMTIgMTJ6bTk2LTE2MHYzNTJjMCAyNi41LTIxLjUgNDgtNDggNDhINDhjLTI2LjUgMC00OC0yMS41LTQ4LTQ4VjgwYzAtMjYuNSAyMS41LTQ4IDQ4LTQ4aDM1MmMyNi41IDAgNDggMjEuNSA0OCA0OHptLTQ4IDM0NlY4NmMwLTMuMy0yLjctNi02LTZINTRjLTMuMyAwLTYgMi43LTYgNnYzNDBjMCAzLjMgMi43IDYgNiA2aDM0MGMzLjMgMCA2LTIuNyA2LTZ6Ij48L3BhdGg+PC9zdmc+');
          opacity: .5;
        }

        .grid-container {
          display: flex;
          flex-direction: row;
          overflow-y: none;
          height: 90%;
        }

        .prox-modal-title {
          padding-bottom: 7%; 
        }

      </style>