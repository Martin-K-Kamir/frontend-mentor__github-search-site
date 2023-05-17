import * as model from './model.js';
import userView from './views/userView.js';
import userBookmarksView from './views/userBookmarksView.js';
import searchView from './views/searchView.js';
import messageView from './views/messageView.js';
import navigationView from './views/navigationView.js';

async function controlLoadingUser() {
    try {
        const locationId = window.location.hash.slice(1) || null;

        const data = await model.getUserData(locationId ?? model.state.query);

        const userObj = model.getUserObject(data)

        model.state.set({user: userObj});

        model.state.set({query: locationId ?? model.state.query});

        userView.setId(model.state.user.id);

        userView.render(model.state.user);

        window.history.pushState(null, '', `#${model.state.user.username}`);

        controlUserHistory();
    } catch (err) {
        if (err.message === 'timeout') {
            messageView.render({
                message: 'Your request took too long. Please try again later!',
                type: 'error',
            })
        }

        if (err.status === 404) {
            messageView.render({
                message: 'User not found.',
                type: 'error',
            })
        }

        if (err.status === 403) {
            messageView.render({
                message: 'API rate limit exceeded.',
                type: 'error',
            })
        }

        userView.renderMessage(':(')
    }
}

async function controlSearchingUser() {
    try {
        const query = searchView.getQuery();
        if (!query) return;

        if (messageView.timerId) clearTimeout(messageView.timerId);

        messageView.timerId = setTimeout(() => {
            messageView.renderLoader('Searching')
        }, 1500);

        model.state.set({query: query});

        const data = await model.getUserData(query);

        clearTimeout(messageView.timerId);

        messageView.hide();

        const userObj = model.getUserObject(data)

        model.state.set({user: userObj});

        userView.setId(model.state.user.id);

        userView.render(model.state.user);

        window.history.pushState(null, '', `#${model.state.user.username}`);

        controlUserHistory();
    } catch (err) {
        if (!navigator.onLine) {
            messageView.render({
                message: 'You are offline. Please check your internet connection! <br> In the meantime, you can check the history of your previous searches or bookmarked users.',
                type: 'error',
            })
        }

        if (err.status === 404) {
            messageView.render({
                message: 'User not found.',
                type: 'error',
            })
        }

        if (err.status === 403) {
            messageView.render({
                message: 'API rate limit exceeded.',
                type: 'error',
            })
        }

        if (err.message === 'timeout') {
            messageView.render({
                message: 'Your request took too long. Please try again later!',
                type: 'error',
            })
        }

        clearTimeout(messageView.timerId)
    }
}

function controlShowBookmarks() {
    if (model.state.bookmarks.length === 0) {
        messageView.render({
            message: 'You have no bookmarks yet. <br> You can bookmark users by clicking on the bookmark icon in the top right corner.',
            type: 'warning'
        })
        return;
    }

    window.history.pushState(null, '', ' ');

    navigationView.setActiveBtn('bookmarks', true);

    userBookmarksView.render(model.state.bookmarks);

    userBookmarksView.animateReveal(true);

    if (userView.timerId) clearTimeout(userView.timerId);

    userView.timerId = setTimeout(() => {
        userView.animateFade(false);

        setTimeout(() => {
            userView.clear();
        }, 500)
    }, 30);
}

function controlHideBookmarks() {
    if (!navigationView.bookmarksActive) return;

    navigationView.setActiveBtn('bookmarks', false);

    userBookmarksView.animateReveal(false);
    userView.animateFade(true);

    userView.render(model.state.user);

    window.history.pushState(null, '', `#${model.state.user.username}`);

    if (userBookmarksView.timerId) clearTimeout(userBookmarksView.timerId);

    userBookmarksView.timerId = setTimeout(() => {
        userBookmarksView.clear()
    }, 500)
}

function controlShowHistory() {
    if (model.state.history.length === 0) {
        messageView.render({
            message: 'You have no history yet. <br> You can search for users by typing their username in the search bar.',
            type: 'warning'
        })
        return;
    }

    window.history.pushState(null, '', ' ');

    navigationView.setActiveBtn('history', true);
}

function controlUserHistory() {
    model.state.set({history: model.getHistory(model.state.user)});
    model.store('history', model.state.history);
    model.store('query', model.state.query);
}

function controlUserBookmarks(id) {
    model.state.set({bookmarks: model.getBookmarks(id)});
    model.state.set({user: {...model.state.user, bookmarked: !model.state.user.bookmarked}});

    userView.update(model.state.user);

    model.store('bookmarks', model.state.bookmarks);
}

function controlDeleteBookmarks() {
    model.state.set({bookmarks: [], user: {...model.state.user, bookmarked: false}});
    model.store('bookmarks', model.state.bookmarks);
    messageView.render({
        message: 'Bookmarks deleted.',
        type: 'success'
    });
}

function controlPreferredTheme() {
    const darkTheme = window.matchMedia("(prefers-color-scheme: dark)");
    const lightTheme = window.matchMedia("(prefers-color-scheme: light)");
    const theme = model.restore('theme');

    if (!theme && darkTheme.matches) {
        navigationView.setTheme('dark');
        model.state.set({theme: 'dark'});
    }

    if (!theme && lightTheme.matches) {
        navigationView.setTheme('light');
        model.state.set({theme: 'light'});
    }

    if (theme && theme === 'dark') {
        navigationView.setTheme('dark');
        model.state.set({theme: 'dark'});
    }

    if (theme && theme === 'light') {
        navigationView.setTheme('light');
        model.state.set({theme: 'light'});
    }

    navigationView.update(model.state.theme);
}

function controlToggleTheme() {
    if (model.state.theme === 'light') {
        navigationView.setTheme('dark');
        model.state.set({theme: 'dark'});
    } else {
        navigationView.setTheme('light');
        model.state.set({theme: 'light'});
    }

    navigationView.update(model.state.theme);
    model.store('theme', model.state.theme);
}

const init = function () {
    userView.handleLoad(controlLoadingUser);
    userView.handleBookmarkClick(controlUserBookmarks);
    userBookmarksView.handleBookmarkClick(controlUserBookmarks);
    userBookmarksView.handleBookmarkLastClick(controlHideBookmarks);
    userBookmarksView.handleCloseClick(controlHideBookmarks);
    userBookmarksView.handleDeleteClick(controlDeleteBookmarks);
    userBookmarksView.handleDeleteClick(controlHideBookmarks);
    searchView.handleSearch(controlSearchingUser);
    searchView.handleSearch(controlHideBookmarks);
    navigationView.handleThemeChange(controlPreferredTheme);
    navigationView.handleThemeClick(controlToggleTheme);
    navigationView.handleBookmarksToggle(controlShowBookmarks, controlHideBookmarks);
};
init();
