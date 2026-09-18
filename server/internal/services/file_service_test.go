package services_test

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/homelab/filemanager/internal/services"
)

func newSvc(t *testing.T) (*services.FileService, string) {
	t.Helper()
	root := t.TempDir()
	return services.NewFileService(root, 10<<20), root
}

func TestListDirectory_Empty(t *testing.T) {
	svc, _ := newSvc(t)
	resp, err := svc.ListDirectory("/")
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.Items) != 0 {
		t.Errorf("expected 0 items, got %d", len(resp.Items))
	}
}

func TestCreateDirectory_And_List(t *testing.T) {
	svc, _ := newSvc(t)

	if err := svc.CreateDirectory("/docs"); err != nil {
		t.Fatal(err)
	}

	resp, err := svc.ListDirectory("/")
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.Items) != 1 || resp.Items[0].Name != "docs" {
		t.Errorf("unexpected items: %+v", resp.Items)
	}
}

func TestCreateDirectory_Duplicate(t *testing.T) {
	svc, _ := newSvc(t)
	_ = svc.CreateDirectory("/dup")
	if err := svc.CreateDirectory("/dup"); err == nil {
		t.Error("expected error creating duplicate directory")
	}
}

func TestRename(t *testing.T) {
	svc, root := newSvc(t)
	_ = os.WriteFile(filepath.Join(root, "old.txt"), []byte("hi"), 0644)

	if err := svc.Rename("/old.txt", "new.txt"); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(root, "new.txt")); err != nil {
		t.Error("renamed file not found")
	}
}

func TestRename_InvalidName(t *testing.T) {
	svc, root := newSvc(t)
	_ = os.WriteFile(filepath.Join(root, "file.txt"), []byte("x"), 0644)

	if err := svc.Rename("/file.txt", "bad/name"); err == nil {
		t.Error("expected error for name with slash")
	}
}

func TestDelete_File(t *testing.T) {
	svc, root := newSvc(t)
	_ = os.WriteFile(filepath.Join(root, "del.txt"), []byte("x"), 0644)

	if err := svc.Delete("/del.txt", false); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(root, "del.txt")); !os.IsNotExist(err) {
		t.Error("file should have been deleted")
	}
}

func TestDelete_Root_Rejected(t *testing.T) {
	svc, _ := newSvc(t)
	if err := svc.Delete("/", true); err == nil {
		t.Error("expected error when deleting storage root")
	}
}

func TestDelete_Dir_RequiresRecursive(t *testing.T) {
	svc, _ := newSvc(t)
	_ = svc.CreateDirectory("/mydir")
	if err := svc.Delete("/mydir", false); err == nil {
		t.Error("expected error deleting directory without recursive=true")
	}
}

func TestMove_TraversalRejected(t *testing.T) {
	svc, root := newSvc(t)
	_ = os.WriteFile(filepath.Join(root, "f.txt"), []byte("x"), 0644)

	if err := svc.Move("/f.txt", "../../etc/passwd"); err == nil {
		t.Error("expected path traversal error")
	}
}

func TestCopy_File(t *testing.T) {
	svc, root := newSvc(t)
	_ = os.WriteFile(filepath.Join(root, "src.txt"), []byte("hello"), 0644)

	if err := svc.Copy(context.Background(), "/src.txt", "/dst.txt"); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(filepath.Join(root, "dst.txt"))
	if err != nil || string(data) != "hello" {
		t.Errorf("copy content mismatch: %v %s", err, data)
	}
}

func TestSearch(t *testing.T) {
	svc, root := newSvc(t)
	_ = os.WriteFile(filepath.Join(root, "report.pdf"), []byte("x"), 0644)
	_ = os.WriteFile(filepath.Join(root, "notes.txt"), []byte("x"), 0644)

	results, err := svc.Search("report", "/")
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 1 || results[0].Name != "report.pdf" {
		t.Errorf("unexpected search results: %+v", results)
	}
}

func TestSearch_TraversalRejected(t *testing.T) {
	svc, _ := newSvc(t)
	if _, err := svc.Search("x", "../../etc"); err == nil {
		t.Error("expected path traversal error in search")
	}
}
