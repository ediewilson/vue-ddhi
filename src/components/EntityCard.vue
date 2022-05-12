<template>
    <div>
        <a id='entity-link'>
        <div class='entity-icon'>
          <span><slot name='iconlabel'></slot></span>
        </div>
        <div class='entity-label'>
          <slot name='label'></slot>
        </div>
        <div class='entity-dates'>
        <slot name='date-range'></slot>
      </div>
      </a>
      <div class='entity-contents'>
        <slot name='contents'></slot>
      </div>
    </div>
</template>
<script>
export default {
    name: 'EntityIcon',
    data () {
        return {
            id: '',
            entityAnchor: '',
        }
    },
    methods: {
        async connectedCallback() {
            super.connectedCallback();

            this.id = this.getAttribute('data-entity-id');
            this.entityAnchor = this.shadowRoot.querySelector('a#entity-link');

            var entitycard = this;

            this.entityAnchor
            .addEventListener('click', () => {
                if (entitycard.hasAttribute('data-mention')) {
                entitycard.propagateAttributes('data-entity-index',entitycard.getAttribute('data-mention') - 1);
                }
                entitycard.propagateSelectedEntity(entitycard.id);
            });
            this.entityAnchor
            .addEventListener('touch', () => {
                entitycard.propagateSelectedEntity(entitycard.id);
                if (entitycard.hasAttribute('data-mention')) {
                entitycard.propagateAttributes('data-entity-index',entitycard.getAttribute('data-mention') - 1);
                }
                entitycard.propagateSelectedEntity(entitycard.id);
            });
        }
    }
}
</script>
<style scoped>
:host {
          position: relative;
          width: 3.5rem;
          height: 3.5rem;
          margin: 0 1rem 3.5rem 1rem;
        }

        a#entity-link {
          text-decoration: none;
          cursor: pointer;
        }

        .entity-icon {
          height: 2rem;
          width: 2rem;
          margin: 0 auto 0.5rem auto;
          border-radius: 0.25rem;
          display: flex;
          justify-content: center;
          align-items: center;
          color: var(--card-txt, #FFFFFF);
          font-weight: 800;
          font-size: 0.7rem;
        }

        :host([data-entity-type='event']) .entity-icon {
          background-color: #9BC8EB;
        }

        :host([data-entity-type='place']) .entity-icon {
          background-color: #FFA00F;
        }

        :host([data-entity-type='person']) .entity-icon {
          background-color: #9D162E;
        }

        :host([data-entity-type='organization']) .entity-icon {
          background-color: #003C73;
        }

        :host([data-entity-type='date']) .entity-icon {
          background-color: rgb(24,98,24);
        }

        .entity-label {
          font-size: 0.7rem;
          text-align: center;
        }

        .entity-contents {
          display: none;
        }

        .entity-dates {
          margin-top: 0.2rem;
          font-size: 0.6rem;
          text-align: center;
          overflow-x: visible;
        }
</style>