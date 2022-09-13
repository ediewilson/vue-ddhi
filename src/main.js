import Vue from 'vue'
import App from './App.vue'
import Vuex from 'vuex'
import axios from 'axios'
import VueAxios from 'vue-axios'

import 'leaflet/dist/leaflet.css';

Vue.config.productionTip = false
Vue.use(Vuex);
Vue.use(VueAxios, axios)
Vue.prototype.$axios = axios;

const store = new Vuex.Store({
  state: {
    repositoryURI: 'https://ddhi-repo-stage.dartmouth.edu', // Set from the ddhi-viewer repository attribute
    apiURI: 'https://ddhi-repo-stage.dartmouth.edu/ddhi-api', // Derived from above
    cdnAssetPath: 'modules/custom/ddhi_rest/assets/ddhi-viewer', // Derived from above
    viewer: '', // The active viewer
    viewHelper: '', // An instance of the DDHI View Plugin
    loading: false,
    availableIds: [], // Available data ids for this visualization
    activeIds: [], // A list of active data ids
    items: {},  // Data keyed by ID.
    tempResult: {}, // Holding property for asynchronous data retrieval.
    supportedEntityTypes: ['events','persons','places','organizations', 'dates'], // Currently supported entities types.
    mentionedEntities: {}, // The list of entities mentioned in a transcript.
    wikidataAPIUrl: 'https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en&sitefilter=enwiki',
    eventData: {},
    eventDateIndex: '', // Indexes event dates by id.
    multiInterview: {},
    // observed attribute state 
    selectedEntity: {},
    entitySort: 'appearance',
    entityFilter: 'all',
    vizType: 'single',
    foreground: {},
  },
  mutations: {
    setSelectedEntity (state, entity) {
      // Adds the most recently searched command
      // to the user's recent searches
      state.selectedEntity = entity;
      console.log("State in setSelectedEntity", state.setSelectedEntity);
    },
    setActiveIds (state, ids) {
      console.log('ids in store = ', ids)
      state.activeIds = ids;
    },
    setEntitySort (state, sort) {
      state.entitySort = sort;
    },
    setEntityFilter (state, filter) {
      state.entityFilter = filter;
    },
    setVizType (state, type) {
      state.vizType = type;
    },
    setForeground (state, fg) {
      state.foreground = fg;
    },
    setMultiInterview (state, m) {
      console.log('in setter', m)
      state.multiInterview = m;
      console.log('in setter', state.multiInterview)
    }
  },
  getters: {
    getSelectedEntity: state => {
      return state.selectedEntity;
    },
    getActiveIds: state => {
      // console.log("status getter", state.status);
      return state.activeIds;
    },
    getEntitySort: state => {
      return state.entitySort;
    },
    getEntityFilter: state => {
      return state.entityFilter;
    },
    getVizType: state => {
      return state.vizType;
    },
    getForeground: state => {
      return state.foreground;
    },
    getARIuri: state => {
      return state.apiURI;
    },
    getMultiInterview: state => {
      return state.multiInterview;
    }
  }
})

new Vue({
  render: h => h(App),
  store: store,
}).$mount('#app')
