import Vue from 'vue'
import Vuex from 'vuex'

import { sendMessageToMain, MessageParser } from './messages'

Vue.use(Vuex)

const store = new Vuex.Store({
  state: {
    loadingMainConfig: true
  },
  getters: {
    isLoading (state) {
      return state.loadingMainConfig
    }
  },
  actions: {
    REQUEST_CONFIG (context) {
      console.log('sending request')
      sendMessageToMain('REQUEST_CONFIG')
    }
  }
})

const messageParser = new MessageParser(store)
messageParser.subscribe()

export default store
