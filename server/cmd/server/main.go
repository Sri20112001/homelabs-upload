package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/homelab/filemanager/internal/applog"
	"github.com/homelab/filemanager/internal/config"
	"github.com/homelab/filemanager/internal/router"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: time.RFC3339})

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("configuration error")
	}

	engine, appLogWriter := router.New(cfg)
	srv := &http.Server{
		Addr:              cfg.Host + ":" + cfg.Port,
		Handler:           engine,
		ReadHeaderTimeout: 30 * time.Second,
	}

	go func() {
		log.Info().Str("addr", srv.Addr).Msg("server starting")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Err(err).Msg("server error")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down gracefully")
	// Persist the shutdown event before draining: shutdown itself is audit data.
	if appLogWriter != nil {
		appLogWriter.Log(applog.Record{
			Level:   applog.LevelInfo,
			Service: "backend",
			Message: "server shutting down",
		})
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("shutdown error")
	}
	// Drain buffered log batches so shutdown loses no records. DB is the
	// authoritative log store — every record must reach it.
	if appLogWriter != nil {
		appLogWriter.Close()
	}
}
