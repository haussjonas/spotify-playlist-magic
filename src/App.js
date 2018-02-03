import React, { Component } from "react";
import { Switch, BrowserRouter as Router, Route } from "react-router-dom";
import queryString from "query-string";
import * as R from "ramda";
import { nest } from "d3-collection";
import "./App.css";

import fetchSpotify, { setAuthorization } from "./lib/api/spotify";

class App extends Component {
  getTracks({ userId, playlistId }) {
    return fetchSpotify({
      url: `/users/${userId}/playlists/${playlistId}/tracks`
    }).map(R.propOr([], "items"));
  }

  // Max. 100, we want to expand it recursivly to hold all tracks.
  getAudioFeaturesOfTracks({ ids }) {
    return fetchSpotify({
      url: "/audio-features",
      params: {
        ids
      }
    }).map(R.propOr([], "audio_features"));
  }

  // Max. 50, we want to expand it recursivly to hold all artists.
  getArtists({ ids }) {
    return fetchSpotify({
      url: "/artists",
      params: {
        ids
      }
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

              setAuthorization(access_token);

              // Andhim
              // const artistId = "6XJeFzmI6vrWyHcdB7EImP";
              // Andhim?
              const userId = "andhimmusic";
              // andhim's weekly favorites
              const playlistId = "1oFPILLPGdeMXdpSTik5U5";

              this.getTracks({ userId, playlistId })
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
                    ids: R.slice(0, 50, artistsIds).join(",")
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
                    ids: ids.join(",")
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
