"use strict";

// IE fix
Vue.component('cell',{
  template: '<td><slot></slot></td>',
});

// Vue!
var app = new Vue({
    el: "#app",

    // vars
    data: {
        email: localStorage.colEmail,
        sideNav: false,
        darkTheme: false,
        isLoading: {
            warrants: false,
            offid: false,
            folders: false,
            foldercontents: false,
            searchresults: false
        },
        currentTab: 3,
        selectedView: '3 or More Warrants',
        folderCategories: [
            { text: 'My Folders', value: 'my' },
            { text: 'Global Folders', value: 'global' },
            { text: 'Auto Folders', value: 'auto' }
        ],
        newFolderDialog: false,
        newFolderName: '',
        selectedFolderCategory: 'my',
        selectedFolder: '',
        offid: -1,
        admin: false,
        folderContents: [],
        warrants: [],
        viewHeaders: [],
        folderContentsHeaders: [],
        folders: {
            my: [],
            global: [],
            auto: []
        },
        tableSearch: {
            warrants: '',
            foldercontents: '',
            searchresults: '',
        },
        globalSearch: {
            search: '',
            fname: '',
            lname: '',
            error: false,
            runOnce: false
        },
        searchType: 'NAME',
        searchTypes: [
            { text: 'Name', value: 'NAME' },
            { text: 'Driver\'s License Number', value: 'DRIVER\'S LICENSE NUMBER' },
            { text: 'Comments', value: 'COMMENTS' },
            { text: 'License Plate Number', value: 'LICENSE PLATE NUMBER' },
            { text: 'Date of Birth', value: 'DATE OF BIRTH' },
            { text: 'Phone Number', value: 'PHONE NUMBER' }
        ],
        searchLimitToActive: false,
        dob: null,
        dobFormatted: null,
        dobMenu: false,
        searchResults: [],
        searchResultsHeaders: []
    },

    computed: {
        tabs: function() {
            var tabs = [
                { name: 'Views', key: 'views' },
                { name: 'Folders', key: 'folders'},
                { name: 'Map', key: 'map'},
                { name: 'Search', key: 'search'}
            ]
            if (this.admin==true) tabs.push({ name: 'Assignments', key: 'assignments' })
            return tabs
        },
        views: function() {
            var views = [
                { text: 'My Warrants', value: 'My Warrants' },
                { text: 'Last Callout Date', value: 'LAST CALLOUT DATE' },
                { text: '2 Callout Dates Ago', value: '2 Callout Dates Ago' },
                { text: '3 or More Warrants', value: '3 or More Warrants' },
                { text: 'Warrants With Work Info', value: 'Warrants With Work Info' },
                { text: 'Special - Volunteer Marked', value: 'Special -- Volunteer Marked' },
                { text: 'Recently Cleared Warrants', value: 'Recently Cleared Warrants' },
                { text: '2017 Round Up Failed Contacts', value: '2017 Round Up Failed Contacts' },
                { text: 'Oldest Warrants', value: 'Oldest Warrants' }
            ]
            if (this.admin==true) views.unshift({ text: 'Admin', value: 'Admin', disabled: true })
            return views
        },
        displayFolders: function() {
            return this.folders[this.selectedFolderCategory].sort(function(a,b) {
                if (a.NMBR < b.NMBR) return -1
                if (a.NMBR > b.NMBR) return 1
                return 0
            }).map(function(folder) {
                return {
                    text: folder.FOLDER_NAME,
                    value: folder.FOLDER_ID
                }
            })
        }
    },

    watch: {
        dob: function(val) {
            this.dobFormatted = this.formatDate(this.dob)
        },
        offid: function() {
            if (this.offid!=-1) this.startup()
        },
        selectedView: function() {
            this.fetchWarrants()
        },
        displayFolders: function() {
            if (this.displayFolders.length!=0) this.selectedFolder = this.displayFolders[0].value
            else this.selectedFolder = ''
        },
        selectedFolder: function() {
            this.fetchFolderContents()
        },
        searchType: function() {
            this.globalSearch.search = ''
            this.globalSearch.fname = ''
            this.globalSearch.lname = ''
        }
    },

    // start here
    mounted: function() {
        this.fetchOfficerId()
    },

    // functions
    methods: {

        fetchOfficerId: function() {
            if (this.isLoading.offid==true) return
            this.isLoading.offid = true
            axios.post('http://ax1vnode1.cityoflewisville.com/v2/?webservice=Courts/Warrants/Get Officer Id', {
                email: localStorage.colEmail,
                auth_token: localStorage.colAuthToken
            })
            .then(this.handleOfficerId)
        },

        handleOfficerId: function(results) {
            if (results.data[0][0].hasOwnProperty('Error')) alert(results.data[0][0].Error)
            else {
                if (results.data[0][0].USER_ROLE=='ADMIN') this.admin = true
                this.offid = results.data[0][0].offid
            }
        },

        startup: function() {
            this.fetchWarrants()
            this.fetchFolders()
        },

        fetchWarrants: function() {
            if (this.isLoading.warrants==true) return
            this.isLoading.warrants = true
            axios.post('http://ax1vnode1.cityoflewisville.com/v2/?webservice=Courts/Warrants/Get View', {
                VIEW_NAME: this.selectedView,
                OFF_ID: this.offid,
                auth_token: localStorage.colAuthToken
            })
            .then(this.handleWarrants)
        },

        // save dataset
        handleWarrants: function(results) {
            this.viewHeaders = []
            for (var prop in results.data.Warrants[0]) {
                if (results.data.Warrants[0].hasOwnProperty(prop)) {
                    this.viewHeaders.push({
                        text: prop,
                        value: prop
                    })
                }
            }
            this.warrants = results.data.Warrants
            this.isLoading.warrants = false
        },

        fetchFolders: function() {
            if (this.isLoading.folders==true) return
            this.isLoading.folders = true
            axios.post('http://ax1vnode1.cityoflewisville.com/v2/?webservice=Courts/Warrants/Get Folders', {
                OFF_ID: this.offid
            })
            .then(this.handleFolders)
        },

        handleFolders: function(results) {
            this.folders.my = results.data['My Folders']
            this.folders.global = results.data['Global Folders']
            this.folders.auto = results.data['Auto Folders']
            this.isLoading.folders = false
        },

        fetchFolderContents: function() {
            if (this.isLoading.foldercontents==true) return
            if (this.selectedFolder == '') {
                this.folderContentsHeaders = []
                this.folderContents = []
            }
            else {
                this.isLoading.foldercontents = true
                axios.post('http://ax1vnode1.cityoflewisville.com/v2/?webservice=Courts/Warrants/Get Folder Contents', {
                    FOLDER_ID: this.selectedFolder
                })
                .then(this.handleFolderContents)
            }
        },

        // save dataset
        handleFolderContents: function(results) {
            this.folderContentsHeaders = []
            for (var prop in results.data.Warrants[0]) {
                if (results.data.Warrants[0].hasOwnProperty(prop)) {
                    this.folderContentsHeaders.push({
                        text: prop,
                        value: prop
                    })
                }
            }
            this.folderContents = results.data.Warrants
            this.isLoading.foldercontents = false
        },

        submitNewFolderName: function() {
            console.log(this.newFolderName, this.selectedFolderCategory)
            this.newFolderDialog = false
        },

        submitSearch: function(query1, query2) {
            if (this.isLoading.searchresults==true) return
            if (!query1 && !query2) {
                this.globalSearch.error = true
                return
            }
            this.isLoading.searchresults = true
            var options = {
                SEARCH_TYPE: this.searchType,
                LIMIT_TO_ACTIVE_WARRANTS: this.searchLimitToActive,
                FIRST_NAME: query1,
                LAST_NAME: query2,
                DLNO: query1,
                COMMENTS: query1,
                LPNO: query1,
                DOB: new Date(this.dob),
                PHONE_NUMBER: query1
            }

            axios.post('http://ax1vnode1.cityoflewisville.com/v2/?webservice=Courts/Warrants/Search', options)
            .then(this.handleSearchResults)
        },

        handleSearchResults: function(results) {
            this.searchResultsHeaders = []
            this.searchResults = []
            if (results.data.length>=1) {
                for (var prop in results.data[0][0]) {
                    if (results.data[0][0].hasOwnProperty(prop)) {
                        this.searchResultsHeaders.push({
                            text: prop,
                            value: prop
                        })
                    }
                }
                this.searchResults = results.data[0]
            }
            this.isLoading.searchresults = false
            if (this.searchResults.length==0) this.globalSearch.error = true
            else this.globalSearch.error = false
            this.globalSearch.runOnce = true
        },

        formatDate: function(date) {
            if (!date) return null
            var [year, month, day] = date.split('-')
            return month+'-'+day+'-'+year
        },

        parseDate: function(date) {
            if (!date) return null
            var [month,day,year] = date.split('-')
            return year + '-' + month.toString().padStart(2, '0') + '-' + day.toString().padStart(2, '0')
        }
    }
})