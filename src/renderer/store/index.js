import Vue from 'vue'
import Vuex from 'vuex'

import { sendMessageToMain, MessageParser } from './messages'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    loadingMainConfig: true,
    config: {
      plugins: []
    }
  },
  getters: {
    isLoading (state) {
      return state.loadingMainConfig
    },
    plugins (state) {
      if (state.config.plugins) {
        return state.config.plugins
      }
      return []
    }
  },
  mutations: {
    CONFIG_UPDATE (state, config) {
      state.config = config
      state.loadingMainConfig = false
    }
  },
  actions: {
    CONFIG_REQUEST (context) {
      sendMessageToMain('CONFIG_REQUEST')
    },
    PLUGIN_ADD (context) {
      sendMessageToMain('PLUGIN_ADD')
    }
  }
})

const messageParser = new MessageParser(store)
messageParser.subscribe()

export default store
