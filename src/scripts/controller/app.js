//jshint esversion: 6
// Main controller file that handles all event handlers
// Using rollup for modules
// command "rollup -c"

import * as recipe from './api/spoonacular';
import * as dropbox from './api/dropbox';
import * as create from '../view/create';
import * as search from '../model/search-model';
import * as my_recipes from '../view/my-recipes';
import * as render from '../view/render-generic';
import {showSearchResults} from '../view/search-results';
// import {LOCAL_URL} from '../.config';
const REDIRECT_URI = 'https://cnsheafe.github.io/spoon-n-drop/build/pages/';
console.log(REDIRECT_URI);
function initAppState() {
  return {
    sessionResults: [],
    currentQuery: '',
    resultList: [],
    myRecipes: [], //list of recipe objs
    loggedIn: false,
    currentRecipe: {}
  };
}
// Checks if user already has access token in session storage
function userHasAccessToken(token) {
  if(token !== 'undefined' && token !== null) {return true;}
  else {
    let redirectResponse = window.location.href.split('#')[1];
    if(typeof redirectResponse != 'undefined') {
      window.sessionStorage.setItem('accessToken', redirectResponse.split('&')[0].split('=')[1]);
      window.location.replace(REDIRECT_URI);
      return true;
    }
    else {return false;}
  }
}

$(function main() {
  let appState = initAppState();
  let token = window.sessionStorage.getItem('accessToken');
  const $navbar = $('header').children('nav');

  if(userHasAccessToken(token)) {
    appState.loggedIn = true;
    $('#login-tab').find('a').text('Logged In');
    $('#create-recipe').removeClass('hide');
    $('#my-recipes').removeClass('hide');
  }

  if(window.matchMedia("(min-width: 768px)").matches) {
    $navbar.removeClass('navbar-fixed-bottom');
    $navbar.children('ul').removeClass('nav-tabs');
    $navbar.children('ul').addClass('nav-stacked nav-pills');
  }
  if(matchMedia) {
    let mqSmall = window.matchMedia('(max-width: 768px)');
    mqSmall.addListener(mqSmall => {
      if(mqSmall.matches) {
        $navbar.addClass('navbar-fixed-bottom');
        $navbar.children('ul').removeClass('nav-stacked nav-pills');
        $navbar.children('ul').addClass('nav-tabs');
      }
      else {
        $navbar.removeClass('navbar-fixed-bottom');
        $navbar.children('ul').addClass('nav-stacked nav-pills');
        $navbar.children('ul').removeClass('nav-tabs');
      }
    });
  }

  $('#login').on('click', () => { if(!appState.loggedIn) {dropbox.OAuth();} });

  $('#search-for-recipes').on('click',function() {
    render.switchView($('#search-page'));
    render.switchActiveTab($(this));
  });

  $('#search-form').on('submit', function(event) {
    event.preventDefault();
    let query = $(this).find('#search-bar').val();
    recipe.getSearchResults(query).done(function (data) {
      search.storeResults(data, appState);
      showSearchResults(appState);
    });
  });

  $('#search-results').on('click','li', function() {
    let xhr = recipe.getRecipeDetails($(this).data('recipeid'));
    xhr.done( function (data) {
      const $recipePage = $('#single-recipe-page');
      render.switchView($recipePage);
      $('#add-to-my-recipes').removeClass('hide');
      appState.currentRecipe = search.simplifyRecipe(data);
      render.showRecipe($recipePage.find('.recipe-container'), appState.currentRecipe);
    });
  });

  $('#create-recipe').on('click', function () {
    render.switchView($('#new-recipe-page'));
    $('#add-to-my-recipes').removeClass('hide');
    render.switchActiveTab($(this));
  });

  $('#my-recipes').on('click', function () {
    if(appState.loggedIn) {
      dropbox.getMyRecipes().then(
        data => {
          appState.myRecipes = data;
          console.log(appState.myRecipes);
          render.switchView($('#my-recipes-page'));
          render.switchActiveTab($(this));
          my_recipes.showList(appState);
        },
        jqxhr => console.log(jqxhr.responseText)
      );
    }
  });

  $('#my-recipes-page').on('click', '.my-recipe-list-item', function() {
    const position = $('#my-recipes-page').find('li').index($(this));
    render.switchView($('#single-recipe-page'));
    $('#add-to-my-recipes').addClass('hide');
    render.showRecipe(
      $('#single-recipe-page').find('.recipe-container'), appState.myRecipes[position]
    );
  });
  $('#my-recipes-page').on('click', '.edit-recipe', function() {
    const position = $('#my-recipes-page').find('.edit-recipe').index($(this));
    render.switchView($('#create-recipe-page'));
  });

  $('#my-recipes-page').on('click', '.delete-recipe', function (event) {
    event.stopPropagation();
    const index = $('.delete-recipe').index($(this));
    appState.myRecipes.splice(index,1);
    dropbox.deleteFileHelper().always(
      data => dropbox.postMyRecipes(appState).then(
        data => {console.log('Success');my_recipes.showList(appState);},
        jqxhr => console.log(jqxhr.responseText)
      )
    );
  });

  $('#new-recipe-page').find('form').on('click', 'button', function(event) {
    event.preventDefault();
    appState.myRecipes.push(create.addRecipe());

    dropbox.deleteFileHelper().always(
      data => dropbox.postMyRecipes(appState).then(
        data => $(this).text('Added to My Recipes'),
        jqxhr => console.log(jqxhr.responseText)
      )
    );
  });

  $('.create-list').on('keypress', 'li', function (event) {
    create.newListItem($(this), event.key);
    $(this).next().find('.ingredient-name').focus();
    console.log($(this));
    console.log($(this).next());
  });

  $('#single-recipe-page').on('click', '#add-to-my-recipes', function() {
    appState.myRecipes.push(appState.currentRecipe);
    console.log(appState.myRecipes);
    dropbox.deleteFileHelper().always(
      data => dropbox.postMyRecipes(appState).then(
        data => console.log('Success'),
        jqxhr => console.log(jqxhr.responseText)
      )
    );
    $(this).text('In My Recipes');
  });
});
