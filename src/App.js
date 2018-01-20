import React, { Component } from "react";
import { Switch, BrowserRouter as Router, Route } from "react-router-dom";
import queryString from "query-string";
import * as R from "ramda";
import { nest } from "d3-collection";
import fetch from "./lib/fetch";
import "./App.css";

class App extends Component {
  getTracks({ userId, playlistId, access_token }) {
    return fetch(
      `https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks`,
      {
        headers: new Headers({
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`
        })
      }
    ).map(R.propOr([], "items"));
  }

  // Max. 100, we want to expand it recursivly to hold all tracks.
  getAudioFeaturesOfTracks({ ids, access_token }) {
    const url = new URL("https://api.spotify.com/v1/audio-features");

    url.searchParams.append("ids", ids);

    return fetch(url, {
      headers: new Headers({
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`
      })
    }).map(R.propOr([], "audio_features"));
  }

  // Max. 50, we want to expand it recursivly to hold all artists.
  getArtists({ ids, access_token }) {
    const url = new URL("https://api.spotify.com/v1/artists");

    url.searchParams.append("ids", ids);

    return fetch(url, {
      headers: new Headers({
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`
      })
    }).map(R.propOr([], "artists"));
  }

  render() {
    return (
      <Router>
        <Switch>
          <Route
            exact
            path="/"
            render={({ ...props }) => {
              const url = new URL("https://accounts.spotify.com/authorize");

              url.searchParams.set(
                "client_id",
                process.env.REACT_APP_SPOTIFY_API_CLIENT_ID
              );
              url.searchParams.set("response_type", "token");
              url.searchParams.set(
                "redirect_uri",
                "http://localhost:3000/callback"
              );
              url.searchParams.set(
                "state",
                Math.random()
                  .toString(36)
                  .substring(2, 7)
              );
              url.searchParams.set("scope", "user-read-private");
              url.searchParams.set("show_dialog", false);

              window.location = url.toString();

              return <div>Home</div>;
            }}
          />
          <Route
            path="/callback"
            render={({ location, ...props }) => {
              const params = queryString.parse(location.hash);
              const { access_token } = params;
              // Andhim
              // const artistId = "6XJeFzmI6vrWyHcdB7EImP";
              // Andhim?
              const userId = "andhimmusic";
              // andhim's weekly favorites
              const playlistId = "1oFPILLPGdeMXdpSTik5U5";

              this.getTracks({ userId, playlistId, access_token })
                .chain(tracks => {
                  const ids = R.map(R.path(["track", "id"]), tracks);

                  const artistsByTracks = R.map(
                    R.path(["track", "artists"]),
                    tracks
                  );

                  const artistsOfTracks = R.uniqBy(
                    R.prop("id"),
                    R.unnest(artistsByTracks)
                  );

                  const artistsIds = R.map(R.propOr([], "id"), artistsOfTracks);

                  this.getArtists({
                    ids: R.slice(0, 50, artistsIds),
                    access_token
                  }).fork(
                    err => console.error(err),
                    response => {
                      const data = nest().entries(response);

                      console.log(
                        R.uniq(R.unnest(R.map(R.prop("genres"), data)))
                      );
                    }
                  );

                  return this.getAudioFeaturesOfTracks({
                    ids,
                    access_token
                  }).map(features => {
                    return R.zipWith(
                      R.merge,
                      tracks,
                      R.map(R.objOf("audio_features"), features)
                    );
                  });
                })
                .fork(
                  err => console.error(err),
                  response => {
                    const data = nest().entries(response);

                    console.log(data);
                  }
                );

              return <div>Callback</div>;
            }}
          />
        </Switch>
      </Router>
    );
  }
}

export default App;
