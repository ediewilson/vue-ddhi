<template>
    <div>
        <li>
            <a @click="toggleSelect" :class='{ active: active}'> {{ this.title }} </a>
        </li>
    </div>
</template>
<script>
export default {
    name: 'MenuItem',
    data () {
        return {
            entityAnchor: '',
        }
    },
    props: {
      id: String,
      title: String,
      activeIds: Array,
    },
     watch: {
        '$store.state.activeIds': function() {
            this.activeIds = this.$store.getters.getActiveIds
        },
     },
     computed: {
         active() {
             return this.activeIds.includes(this.id);
         }
     },
    methods: {
        toggleSelect() {
            let activeId
            console.log(this.activeIds.includes(this.id), this.id, this.activeIds)
            // todo today: emit title change to viewer object 

            var transcriptID = this.id;
            this.$emit('titleChange', this.title, transcriptID)
            if(!this.active) {
                if(this.$store.getters.getVizType == 'single') {
                    activeId = [] 
                    activeId.push(transcriptID)
                    console.log('new active')
                    this.$store.commit('setActiveIds', activeId)
                }
                else {
                    activeId = this.activeIds
                    activeId.push(transcriptID)
                    this.$store.commit('setActiveIds', activeId)

                }
            }
            else {
                if(this.$store.getters.getVizType == 'single') {
                    this.$store.commit('setActiveIds',  [])
                }
                else {
                    activeId = this.activeIds

                    for( var i = 0; i < activeId.length; i++){ 
                    
                        if ( activeId[i] === this.id) { 
                    
                            activeId.splice(i, 1); 
                        }
                    
                    }
                    this.$store.commit('setActiveIds', activeId)

                }

            }
        
        }, 
    }
}
</script>
<style scoped>
.active {
    font-weight: 800;
}
li {
    list-style-type: none;
    font-size: 0.75rem;
    font-weight: 400;
    margin-left: 0;
    padding-left: 0;
    margin-bottom: 0.75rem;
}

li:hover {
    text-decoration: underline;
}

a {
    cursor: pointer;
}
</style>