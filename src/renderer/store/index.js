import Vue from 'vue'
import Vuex from 'vuex'

import { sendMessageToMain, MessageParser } from './messages'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    loadingMainConfig: true,
    config: {}
  },
  getters: {
    isLoading (state) {
      return state.loadingMainConfig
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
    }
  }
})

const messageParser = new MessageParser(store)
messageParser.subscribe()

export default store
